import { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeWebGlResourceManager } from "./IgeWebGlResourceManager.js";
import type { IgeDirectionalLight } from "./IgeWebGlLight.js"
import type { IgeWebGlProgram } from "./IgeWebGlProgram.js";
import { IgeMatrix4 } from "../core/IgeMatrix4.js"
/**
 * Shadow map configuration.
 */
export interface IgeShadowMapConfig {
    /** Size of the shadow map texture (width and height) */
    size: number;
    /** Bias to prevent shadow acne */
    bias: number;
    /** Normal bias for additional acne prevention */
    normalBias: number;
    /** Softness of shadow edges (0-1) */
    softness: number;
    /** PCF sample count (1, 4, 9, 16) */
    pcfSamples: number;
}
/**
 * Shadow map data for a single light.
 */
interface ShadowMapData {
    framebuffer: WebGLFramebuffer;
    depthTexture: WebGLTexture;
    colorTexture?: WebGLTexture;
    lightSpaceMatrix: Float32Array;
    size: number;
    bias: number;
    normalBias: number;
}
/**
 * Manages shadow maps for the WebGL renderer.
 * Supports directional light shadows with PCF soft shadows.
 */
export declare class IgeWebGlShadowManager extends IgeBaseClass {
    classId: string;
    protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected _resourceManager: IgeWebGlResourceManager;
    protected _webglVersion: 1 | 2;
    protected _shadowMaps: Map<string, ShadowMapData>;
    protected _enabled: boolean;
    protected _defaultConfig: IgeShadowMapConfig;
    protected _lightViewMatrix: IgeMatrix4;
    protected _lightProjectionMatrix: IgeMatrix4;
    protected _lightSpaceMatrix: IgeMatrix4;
    protected _shadowFrustumSize: number;
    protected _shadowNear: number;
    protected _shadowFar: number;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, resourceManager: IgeWebGlResourceManager, webglVersion: 1 | 2);
    /**
     * Enable or disable shadow mapping.
     */
    enabled(val?: boolean): boolean | this;
    /**
     * Set the shadow frustum size (world units covered by shadow map).
     */
    frustumSize(val?: number): number | this;
    /**
     * Set the shadow near/far planes.
     */
    shadowPlanes(near?: number, far?: number): {
        near: number;
        far: number;
    } | this;
    /**
     * Create or update a shadow map for a directional light.
     */
    createShadowMap(lightId: string, config?: Partial<IgeShadowMapConfig>): boolean;
    /**
     * Delete a shadow map.
     */
    deleteShadowMap(lightId: string): void;
    /**
     * Update the light space matrix for a directional light.
     * @param lightId The light identifier
     * @param light The directional light
     * @param cameraPosition Camera position (used for following the camera, but we focus on scene center)
     * @param sceneCenter Optional scene center to focus shadows on (defaults to origin)
     */
    updateLightSpaceMatrix(lightId: string, light: IgeDirectionalLight, cameraPosition?: {
        x: number;
        y: number;
        z: number;
    }, sceneCenter?: {
        x: number;
        y: number;
        z: number;
    }): Float32Array | null;
    /**
     * Begin shadow pass rendering.
     * Binds the shadow framebuffer and sets up viewport.
     */
    beginShadowPass(lightId: string): boolean;
    /**
     * End shadow pass rendering.
     * Restores default framebuffer and GL state.
     */
    endShadowPass(): void;
    /**
     * Apply shadow uniforms to a shader program.
     */
    applyShadowUniforms(program: IgeWebGlProgram, lightId: string, textureUnit?: number): boolean;
    /**
     * Get the light space matrix for a light.
     */
    getLightSpaceMatrix(lightId: string): Float32Array | null;
    /**
     * Get shadow map texture for a light.
     */
    getShadowMapTexture(lightId: string): WebGLTexture | null;
    /**
     * Check if a light has a shadow map.
     */
    hasShadowMap(lightId: string): boolean;
    /**
     * Get statistics about shadow maps.
     */
    getStats(): {
        enabled: boolean;
        count: number;
        totalSize: number;
    };
    /**
     * Clear all shadow maps.
     */
    clearAll(): void;
}
export {};
