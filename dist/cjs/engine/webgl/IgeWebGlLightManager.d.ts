import { IgeBaseClass } from "../core/IgeBaseClass.js"
import { IgeWebGlLight, IgeAmbientLight, IgeDirectionalLight, IgePointLight, IgeSpotLight } from "./IgeWebGlLight.js";
import type { IgeWebGlProgram } from "./IgeWebGlProgram.js"
/**
 * Manages lights for WebGL rendering.
 * Tracks all active lights and provides methods to update shader uniforms.
 */
export declare class IgeWebGlLightManager extends IgeBaseClass {
    classId: string;
    protected _ambientLights: IgeAmbientLight[];
    protected _directionalLights: IgeDirectionalLight[];
    protected _pointLights: IgePointLight[];
    protected _spotLights: IgeSpotLight[];
    protected _combinedAmbient: {
        r: number;
        g: number;
        b: number;
        intensity: number;
    };
    /**
     * Add a light to be tracked.
     */
    addLight(light: IgeWebGlLight): void;
    /**
     * Remove a light from tracking.
     */
    removeLight(light: IgeWebGlLight): void;
    /**
     * Update combined ambient light from all ambient light sources.
     */
    protected _updateCombinedAmbient(): void;
    /**
     * Set a default ambient light level.
     */
    setDefaultAmbient(r: number, g: number, b: number): void;
    /**
     * Apply all light uniforms to a shader program.
     */
    applyLightUniforms(program: IgeWebGlProgram): void;
    /**
     * Get the number of active lights.
     */
    getLightCount(): {
        ambient: number;
        directional: number;
        point: number;
        spot: number;
        total: number;
    };
    /**
     * Check if any lights are in the scene.
     */
    hasLights(): boolean;
    /**
     * Clear all tracked lights.
     */
    clearLights(): void;
}
