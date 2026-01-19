import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePoint3d } from "@/engine/core/IgePoint3d";

/**
 * Light types supported by the WebGL renderer.
 */
export enum IgeLightType {
	Ambient = "ambient",
	Directional = "directional",
	Point = "point",
	Spot = "spot"
}

/**
 * Base light class for WebGL rendering.
 * Lights can be mounted to the scene graph like entities.
 */
export class IgeWebGlLight extends IgeEntity {
	classId = "IgeWebGlLight";

	// Light properties
	protected _lightType: IgeLightType = IgeLightType.Point;
	protected _lightColor: { r: number; g: number; b: number } = { r: 1, g: 1, b: 1 };
	protected _intensity: number = 1.0;
	protected _castShadow: boolean = false;
	protected _shadowBias: number = 0.005;
	protected _shadowMapSize: number = 1024;

	constructor() {
		super();
	}

	/**
	 * Gets the light type.
	 */
	lightType(): IgeLightType {
		return this._lightType;
	}

	/**
	 * Gets / sets the light color.
	 */
	lightColor(r?: number, g?: number, b?: number): { r: number; g: number; b: number } | this {
		if (r !== undefined) {
			this._lightColor.r = r;
			this._lightColor.g = g ?? r;
			this._lightColor.b = b ?? r;
			return this;
		}
		return this._lightColor;
	}

	/**
	 * Sets light color from hex string.
	 */
	lightColorHex(hex: string): this {
		hex = hex.replace(/^#/, "");
		this._lightColor.r = parseInt(hex.substring(0, 2), 16) / 255;
		this._lightColor.g = parseInt(hex.substring(2, 4), 16) / 255;
		this._lightColor.b = parseInt(hex.substring(4, 6), 16) / 255;
		return this;
	}

	/**
	 * Gets / sets the light intensity.
	 */
	intensity(val?: number): number | this {
		if (val !== undefined) {
			this._intensity = Math.max(0, val);
			return this;
		}
		return this._intensity;
	}

	/**
	 * Gets / sets whether this light casts shadows.
	 */
	castShadow(val?: boolean): boolean | this {
		if (val !== undefined) {
			this._castShadow = val;
			return this;
		}
		return this._castShadow;
	}

	/**
	 * Gets / sets the shadow bias.
	 */
	shadowBias(val?: number): number | this {
		if (val !== undefined) {
			this._shadowBias = val;
			return this;
		}
		return this._shadowBias;
	}

	/**
	 * Gets / sets the shadow map size.
	 */
	shadowMapSize(val?: number): number | this {
		if (val !== undefined) {
			this._shadowMapSize = val;
			return this;
		}
		return this._shadowMapSize;
	}

	/**
	 * Get light data for shader uniforms.
	 */
	getLightData(): {
		type: IgeLightType;
		color: { r: number; g: number; b: number };
		intensity: number;
		position: IgePoint3d;
		direction?: IgePoint3d;
	} {
		return {
			type: this._lightType,
			color: this._lightColor,
			intensity: this._intensity,
			position: this._translate
		};
	}
}

/**
 * Ambient light - provides uniform illumination to all surfaces.
 * Has no position or direction, just color and intensity.
 */
export class IgeAmbientLight extends IgeWebGlLight {
	classId = "IgeAmbientLight";

	constructor() {
		super();
		this._lightType = IgeLightType.Ambient;
		this._intensity = 0.2; // Default low intensity for ambient
	}
}

/**
 * Directional light - simulates distant light source like the sun.
 * All rays are parallel, defined by direction only.
 */
export class IgeDirectionalLight extends IgeWebGlLight {
	classId = "IgeDirectionalLight";

	// Direction the light is pointing (normalized)
	protected _direction: { x: number; y: number; z: number } = { x: 0, y: -1, z: 0 };

	constructor() {
		super();
		this._lightType = IgeLightType.Directional;
	}

	/**
	 * Gets / sets the light direction.
	 * The direction vector will be normalized.
	 */
	direction(x?: number, y?: number, z?: number): { x: number; y: number; z: number } | this {
		if (x !== undefined) {
			// Normalize the direction
			const len = Math.sqrt(x * x + (y ?? 0) * (y ?? 0) + (z ?? 0) * (z ?? 0));
			if (len > 0) {
				this._direction.x = x / len;
				this._direction.y = (y ?? 0) / len;
				this._direction.z = (z ?? 0) / len;
			}
			return this;
		}
		return this._direction;
	}

	/**
	 * Point the light at a target position.
	 */
	pointAt(x: number, y: number, z: number): this {
		// Direction from light position to target
		const dx = x - this._translate.x;
		const dy = y - this._translate.y;
		const dz = z - this._translate.z;
		return this.direction(dx, dy, dz) as this;
	}

	/**
	 * Get light data for shader uniforms.
	 */
	getLightData() {
		return {
			...super.getLightData(),
			direction: this._direction as IgePoint3d
		};
	}
}

/**
 * Point light - emits light in all directions from a single point.
 * Light intensity attenuates with distance.
 */
export class IgePointLight extends IgeWebGlLight {
	classId = "IgePointLight";

	// Attenuation parameters
	protected _range: number = 100; // Maximum range of light influence
	protected _decay: number = 2; // Attenuation decay (2 = physically correct)

	constructor() {
		super();
		this._lightType = IgeLightType.Point;
	}

	/**
	 * Gets / sets the light range (maximum distance of influence).
	 */
	range(val?: number): number | this {
		if (val !== undefined) {
			this._range = Math.max(0, val);
			return this;
		}
		return this._range;
	}

	/**
	 * Gets / sets the attenuation decay.
	 * 1 = linear, 2 = quadratic (physically correct)
	 */
	decay(val?: number): number | this {
		if (val !== undefined) {
			this._decay = Math.max(0, val);
			return this;
		}
		return this._decay;
	}

	/**
	 * Get light data for shader uniforms.
	 */
	getLightData() {
		return {
			...super.getLightData(),
			range: this._range,
			decay: this._decay
		};
	}
}

/**
 * Spot light - emits light in a cone from a single point.
 */
export class IgeSpotLight extends IgeWebGlLight {
	classId = "IgeSpotLight";

	// Direction the spotlight is pointing
	protected _direction: { x: number; y: number; z: number } = { x: 0, y: -1, z: 0 };

	// Cone parameters
	protected _angle: number = Math.PI / 4; // Outer cone angle in radians (45°)
	protected _penumbra: number = 0.1; // Softness of the edge (0-1)
	protected _range: number = 100;
	protected _decay: number = 2;

	constructor() {
		super();
		this._lightType = IgeLightType.Spot;
	}

	/**
	 * Gets / sets the light direction.
	 */
	direction(x?: number, y?: number, z?: number): { x: number; y: number; z: number } | this {
		if (x !== undefined) {
			const len = Math.sqrt(x * x + (y ?? 0) * (y ?? 0) + (z ?? 0) * (z ?? 0));
			if (len > 0) {
				this._direction.x = x / len;
				this._direction.y = (y ?? 0) / len;
				this._direction.z = (z ?? 0) / len;
			}
			return this;
		}
		return this._direction;
	}

	/**
	 * Point the spotlight at a target position.
	 */
	pointAt(x: number, y: number, z: number): this {
		const dx = x - this._translate.x;
		const dy = y - this._translate.y;
		const dz = z - this._translate.z;
		return this.direction(dx, dy, dz) as this;
	}

	/**
	 * Gets / sets the cone angle in radians.
	 */
	angle(val?: number): number | this {
		if (val !== undefined) {
			this._angle = Math.max(0, Math.min(Math.PI / 2, val));
			return this;
		}
		return this._angle;
	}

	/**
	 * Gets / sets the cone angle in degrees.
	 */
	angleDegrees(val?: number): number | this {
		if (val !== undefined) {
			return this.angle((val * Math.PI) / 180) as this;
		}
		return (this._angle * 180) / Math.PI;
	}

	/**
	 * Gets / sets the penumbra (edge softness, 0-1).
	 */
	penumbra(val?: number): number | this {
		if (val !== undefined) {
			this._penumbra = Math.max(0, Math.min(1, val));
			return this;
		}
		return this._penumbra;
	}

	/**
	 * Gets / sets the light range.
	 */
	range(val?: number): number | this {
		if (val !== undefined) {
			this._range = Math.max(0, val);
			return this;
		}
		return this._range;
	}

	/**
	 * Gets / sets the attenuation decay.
	 */
	decay(val?: number): number | this {
		if (val !== undefined) {
			this._decay = Math.max(0, val);
			return this;
		}
		return this._decay;
	}

	/**
	 * Get light data for shader uniforms.
	 */
	getLightData() {
		return {
			...super.getLightData(),
			direction: this._direction as IgePoint3d,
			angle: this._angle,
			penumbra: this._penumbra,
			range: this._range,
			decay: this._decay
		};
	}
}
