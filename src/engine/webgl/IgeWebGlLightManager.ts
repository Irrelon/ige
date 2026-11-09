import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import {
	IgeWebGlLight,
	IgeAmbientLight,
	IgeDirectionalLight,
	IgePointLight,
	IgeSpotLight,
	IgeLightType
} from "@/engine/webgl/IgeWebGlLight";
import type { IgeWebGlProgram } from "@/engine/webgl/IgeWebGlProgram";

/**
 * Most point and spot lights the shader takes at once. Any number can be
 * added: each view draws with the ones that matter most to it (see focus()).
 */
const MAX_POINT_LIGHTS = 8;
const MAX_SPOT_LIGHTS = 4;

/**
 * Manages lights for WebGL rendering.
 * Tracks every light; before each view draws, focus() picks the point and
 * spot lights that reach that view (nearest first, up to the shader's
 * limits), so a level can have a light in every room and corridor.
 */
export class IgeWebGlLightManager extends IgeBaseClass {
	classId = "IgeWebGlLightManager";

	// Tracked lights
	protected _ambientLights: IgeAmbientLight[] = [];
	protected _directionalLights: IgeDirectionalLight[] = [];
	protected _pointLights: IgePointLight[] = [];
	protected _spotLights: IgeSpotLight[] = [];
	/** The point and spot lights the current view draws with (see focus()). */
	protected _activePoint: IgePointLight[] = [];
	protected _activeSpot: IgeSpotLight[] = [];
	protected _focused: boolean = false;

	// Combined ambient color
	protected _combinedAmbient: { r: number; g: number; b: number; intensity: number } = {
		r: 0.1,
		g: 0.1,
		b: 0.1,
		intensity: 1.0
	};

	/**
	 * Add a light to be tracked.
	 */
	addLight(light: IgeWebGlLight): void {
		const type = light.lightType();

		switch (type) {
			case IgeLightType.Ambient:
				if (!this._ambientLights.includes(light as IgeAmbientLight)) {
					this._ambientLights.push(light as IgeAmbientLight);
					this._updateCombinedAmbient();
				}
				break;
			case IgeLightType.Directional:
				if (!this._directionalLights.includes(light as IgeDirectionalLight)) {
					this._directionalLights.push(light as IgeDirectionalLight);
				}
				break;
			case IgeLightType.Point:
				if (!this._pointLights.includes(light as IgePointLight)) this._pointLights.push(light as IgePointLight);
				break;
			case IgeLightType.Spot:
				if (!this._spotLights.includes(light as IgeSpotLight)) this._spotLights.push(light as IgeSpotLight);
				break;
		}
	}

	/**
	 * Remove a light from tracking.
	 */
	removeLight(light: IgeWebGlLight): void {
		const type = light.lightType();

		switch (type) {
			case IgeLightType.Ambient:
				const ambientIndex = this._ambientLights.indexOf(light as IgeAmbientLight);
				if (ambientIndex > -1) {
					this._ambientLights.splice(ambientIndex, 1);
					this._updateCombinedAmbient();
				}
				break;
			case IgeLightType.Directional:
				const dirIndex = this._directionalLights.indexOf(light as IgeDirectionalLight);
				if (dirIndex > -1) {
					this._directionalLights.splice(dirIndex, 1);
				}
				break;
			case IgeLightType.Point:
				const pointIndex = this._pointLights.indexOf(light as IgePointLight);
				if (pointIndex > -1) {
					this._pointLights.splice(pointIndex, 1);
				}
				break;
			case IgeLightType.Spot:
				const spotIndex = this._spotLights.indexOf(light as IgeSpotLight);
				if (spotIndex > -1) {
					this._spotLights.splice(spotIndex, 1);
				}
				break;
		}
	}

	/**
	 * Update combined ambient light from all ambient light sources.
	 */
	protected _updateCombinedAmbient(): void {
		let r = 0, g = 0, b = 0;

		for (const light of this._ambientLights) {
			const data = light.getLightData();
			const intensity = data.intensity;
			r += data.color.r * intensity;
			g += data.color.g * intensity;
			b += data.color.b * intensity;
		}

		// If no ambient lights, no ambient contribution (fully dark)
		// Use setDefaultAmbient() to override this if desired

		this._combinedAmbient = { r, g, b, intensity: 1.0 };
	}

	/**
	 * Set a default ambient light level.
	 */
	setDefaultAmbient(r: number, g: number, b: number): void {
		if (this._ambientLights.length === 0) {
			this._combinedAmbient = { r, g, b, intensity: 1.0 };
		}
	}

	/**
	 * Choose the point and spot lights for a view centred on (x, y, z) that
	 * shows things within `radius` of it: lights whose range reaches that
	 * area, nearest first, up to the shader's limits (8 point, 4 spot).
	 * The renderer calls this before drawing each view.
	 */
	focus(x: number, y: number, z: number, radius: number): void {
		this._focused = true;
		this._activePoint = this._nearest(this._pointLights, x, y, z, radius, MAX_POINT_LIGHTS);
		this._activeSpot = this._nearest(this._spotLights, x, y, z, radius, MAX_SPOT_LIGHTS);
	}

	/** The point lights the current view draws with. */
	activePointLights(): IgePointLight[] {
		return this._focused ? this._activePoint : this._pointLights.slice(0, MAX_POINT_LIGHTS);
	}

	/** The spot lights the current view draws with. */
	activeSpotLights(): IgeSpotLight[] {
		return this._focused ? this._activeSpot : this._spotLights.slice(0, MAX_SPOT_LIGHTS);
	}

	protected _nearest<T extends IgePointLight | IgeSpotLight>(lights: T[], x: number, y: number, z: number, radius: number, max: number): T[] {
		if (lights.length <= max) return lights.filter((light) => this._reaches(light, x, y, z, radius) >= 0);
		const scored: { light: T; score: number }[] = [];
		for (const light of lights) {
			const score = this._reaches(light, x, y, z, radius);
			if (score >= 0) scored.push({ light, score });
		}
		scored.sort((a, b) => a.score - b.score);
		return scored.slice(0, max).map((s) => s.light);
	}

	/** Distance from the light to the view's centre if its range reaches the view, else -1. Zero intensity lights don't count. */
	protected _reaches(light: IgePointLight | IgeSpotLight, x: number, y: number, z: number, radius: number): number {
		const data = light.getLightData();
		if (data.intensity <= 0) return -1;
		const p = data.position;
		const d = Math.hypot(p.x - x, p.y - y, p.z - z);
		const range = (data as any).range || 100;
		return d <= range + radius ? d : -1;
	}

	/**
	 * Apply all light uniforms to a shader program.
	 */
	applyLightUniforms(program: IgeWebGlProgram): void {
		// Ambient light
		program.setUniform3f(
			"u_ambientLightColor",
			this._combinedAmbient.r,
			this._combinedAmbient.g,
			this._combinedAmbient.b
		);
		program.setUniform1f("u_ambientLightIntensity", this._combinedAmbient.intensity);

		// Directional light (use first one if available)
		if (this._directionalLights.length > 0) {
			const dirLight = this._directionalLights[0];
			const data = dirLight.getLightData();

			program.setUniform1i("u_hasDirectionalLight", 1);
			// Direction TO the light (opposite of light direction)
			const dir = data.direction!;
			program.setUniform3f("u_directionalLightDir", -dir.x, -dir.y, -dir.z);
			program.setUniform3f("u_directionalLightColor", data.color.r, data.color.g, data.color.b);
			program.setUniform1f("u_directionalLightIntensity", data.intensity);
		} else {
			program.setUniform1i("u_hasDirectionalLight", 0);
		}

		// Point lights
		const points = this.activePointLights();
		program.setUniform1i("u_numPointLights", points.length);
		for (let i = 0; i < points.length; i++) {
			const light = points[i];
			const data = light.getLightData();

			program.setUniform3f(`u_pointLightPositions[${i}]`, data.position.x, data.position.y, data.position.z);
			program.setUniform3f(`u_pointLightColors[${i}]`, data.color.r, data.color.g, data.color.b);
			program.setUniform1f(`u_pointLightIntensities[${i}]`, data.intensity);
			program.setUniform1f(`u_pointLightRanges[${i}]`, (data as any).range || 100);
			program.setUniform1f(`u_pointLightDecays[${i}]`, (data as any).decay || 2);
		}

		// Spot lights
		const spots = this.activeSpotLights();
		program.setUniform1i("u_numSpotLights", spots.length);
		for (let i = 0; i < spots.length; i++) {
			const light = spots[i];
			const data = light.getLightData();

			program.setUniform3f(`u_spotLightPositions[${i}]`, data.position.x, data.position.y, data.position.z);
			const dir = data.direction!;
			program.setUniform3f(`u_spotLightDirections[${i}]`, dir.x, dir.y, dir.z);
			program.setUniform3f(`u_spotLightColors[${i}]`, data.color.r, data.color.g, data.color.b);
			program.setUniform1f(`u_spotLightIntensities[${i}]`, data.intensity);
			program.setUniform1f(`u_spotLightRanges[${i}]`, (data as any).range || 100);
			// Convert angle to cosine for shader comparison
			program.setUniform1f(`u_spotLightAngles[${i}]`, Math.cos((data as any).angle || Math.PI / 4));
			program.setUniform1f(`u_spotLightPenumbras[${i}]`, (data as any).penumbra || 0.1);
		}
	}

	/**
	 * Get the number of active lights.
	 */
	getLightCount(): {
		ambient: number;
		directional: number;
		point: number;
		spot: number;
		total: number;
	} {
		return {
			ambient: this._ambientLights.length,
			directional: this._directionalLights.length,
			point: this._pointLights.length,
			spot: this._spotLights.length,
			total: this._ambientLights.length + this._directionalLights.length +
				this._pointLights.length + this._spotLights.length
		};
	}

	/**
	 * Check if any lights are in the scene.
	 */
	hasLights(): boolean {
		return this._ambientLights.length > 0 ||
			this._directionalLights.length > 0 ||
			this._pointLights.length > 0 ||
			this._spotLights.length > 0;
	}

	/**
	 * Clear all tracked lights.
	 */
	clearLights(): void {
		this._ambientLights = [];
		this._directionalLights = [];
		this._pointLights = [];
		this._spotLights = [];
		this._activePoint = [];
		this._activeSpot = [];
		this._updateCombinedAmbient();
	}
}
