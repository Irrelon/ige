import { IgeEntity } from "../core/IgeEntity.js"
import type { IgePoint3d } from "../core/IgePoint3d.js";
/**
 * Light types supported by the WebGL renderer.
 */
export declare enum IgeLightType {
    Ambient = "ambient",
    Directional = "directional",
    Point = "point",
    Spot = "spot"
}
/**
 * Base light class for WebGL rendering.
 * Lights can be mounted to the scene graph like entities.
 */
export declare class IgeWebGlLight extends IgeEntity {
    classId: string;
    protected _lightType: IgeLightType;
    protected _lightColor: {
        r: number;
        g: number;
        b: number;
    };
    protected _intensity: number;
    protected _castShadow: boolean;
    protected _shadowBias: number;
    protected _shadowMapSize: number;
    constructor();
    /**
     * Gets the light type.
     */
    lightType(): IgeLightType;
    /**
     * Gets / sets the light color.
     */
    lightColor(r?: number, g?: number, b?: number): {
        r: number;
        g: number;
        b: number;
    } | this;
    /**
     * Sets light color from hex string.
     */
    lightColorHex(hex: string): this;
    /**
     * Gets / sets the light intensity.
     */
    intensity(val?: number): number | this;
    /**
     * Gets / sets whether this light casts shadows.
     */
    castShadow(val?: boolean): boolean | this;
    /**
     * Gets / sets the shadow bias.
     */
    shadowBias(val?: number): number | this;
    /**
     * Gets / sets the shadow map size.
     */
    shadowMapSize(val?: number): number | this;
    /**
     * Get light data for shader uniforms.
     */
    getLightData(): {
        type: IgeLightType;
        color: {
            r: number;
            g: number;
            b: number;
        };
        intensity: number;
        position: IgePoint3d;
        direction?: IgePoint3d;
    };
}
/**
 * Ambient light - provides uniform illumination to all surfaces.
 * Has no position or direction, just color and intensity.
 */
export declare class IgeAmbientLight extends IgeWebGlLight {
    classId: string;
    constructor();
}
/**
 * Directional light - simulates distant light source like the sun.
 * All rays are parallel, defined by direction only.
 */
export declare class IgeDirectionalLight extends IgeWebGlLight {
    classId: string;
    protected _direction: {
        x: number;
        y: number;
        z: number;
    };
    constructor();
    /**
     * Gets / sets the light direction.
     * The direction vector will be normalized.
     */
    direction(x?: number, y?: number, z?: number): {
        x: number;
        y: number;
        z: number;
    } | this;
    /**
     * Point the light at a target position.
     */
    pointAt(x: number, y: number, z: number): this;
    /**
     * Get light data for shader uniforms.
     */
    getLightData(): {
        direction: IgePoint3d;
        type: IgeLightType;
        color: {
            r: number;
            g: number;
            b: number;
        };
        intensity: number;
        position: IgePoint3d;
    };
}
/**
 * Point light - emits light in all directions from a single point.
 * Light intensity attenuates with distance.
 */
export declare class IgePointLight extends IgeWebGlLight {
    classId: string;
    protected _range: number;
    protected _decay: number;
    constructor();
    /**
     * Gets / sets the light range (maximum distance of influence).
     */
    range(val?: number): number | this;
    /**
     * Gets / sets the attenuation decay.
     * 1 = linear, 2 = quadratic (physically correct)
     */
    decay(val?: number): number | this;
    /**
     * Get light data for shader uniforms.
     */
    getLightData(): {
        range: number;
        decay: number;
        type: IgeLightType;
        color: {
            r: number;
            g: number;
            b: number;
        };
        intensity: number;
        position: IgePoint3d;
        direction?: IgePoint3d;
    };
}
/**
 * Spot light - emits light in a cone from a single point.
 */
export declare class IgeSpotLight extends IgeWebGlLight {
    classId: string;
    protected _direction: {
        x: number;
        y: number;
        z: number;
    };
    protected _angle: number;
    protected _penumbra: number;
    protected _range: number;
    protected _decay: number;
    constructor();
    /**
     * Gets / sets the light direction.
     */
    direction(x?: number, y?: number, z?: number): {
        x: number;
        y: number;
        z: number;
    } | this;
    /**
     * Point the spotlight at a target position.
     */
    pointAt(x: number, y: number, z: number): this;
    /**
     * Gets / sets the cone angle in radians.
     */
    angle(val?: number): number | this;
    /**
     * Gets / sets the cone angle in degrees.
     */
    angleDegrees(val?: number): number | this;
    /**
     * Gets / sets the penumbra (edge softness, 0-1).
     */
    penumbra(val?: number): number | this;
    /**
     * Gets / sets the light range.
     */
    range(val?: number): number | this;
    /**
     * Gets / sets the attenuation decay.
     */
    decay(val?: number): number | this;
    /**
     * Get light data for shader uniforms.
     */
    getLightData(): {
        direction: IgePoint3d;
        angle: number;
        penumbra: number;
        range: number;
        decay: number;
        type: IgeLightType;
        color: {
            r: number;
            g: number;
            b: number;
        };
        intensity: number;
        position: IgePoint3d;
    };
}
