import { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeWebGlResourceManager } from "./IgeWebGlResourceManager.js"
import type { IgeDirectionalLight, IgePointLight } from "./IgeWebGlLight.js"
import type { IgeWebGlProgram } from "./IgeWebGlProgram.js"
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
 * Shadow map data for a point light using a 3x2 atlas texture.
 * All 6 cube faces are rendered into a single texture in a 3-column x 2-row grid.
 * Face layout: row0=[+X, -X, +Y], row1=[-Y, +Z, -Z]
 */
export interface PointShadowMapData {
    framebuffer: WebGLFramebuffer;
    atlasTexture: WebGLTexture;
    depthRenderbuffer: WebGLRenderbuffer;
    blurFramebuffer: WebGLFramebuffer;
    blurTexture: WebGLTexture;
    lightSpaceMatrices: IgeMatrix4[];
    faceSize: number;
    bias: number;
    nearPlane: number;
    farPlane: number;
}
/** Maximum number of point lights that can cast shadows. */
export declare const MAX_SHADOW_POINT_LIGHTS = 2;
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
    protected _quadBuffer: WebGLBuffer | null;
    protected _pointShadowMaps: Map<string, PointShadowMapData>;
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
     * Create a point light shadow map using a 3x2 atlas texture.
     * All 6 cube faces are rendered into a single RGBA texture.
     * Layout: row0=[+X, -X, +Y], row1=[-Y, +Z, -Z]
     */
    createPointShadowMap(lightId: string, config?: {
        size?: number;
        bias?: number;
        nearPlane?: number;
        farPlane?: number;
    }): boolean;
    /**
     * Delete a point light shadow map.
     */
    deletePointShadowMap(lightId: string): void;
    /**
     * Update the 6 light-space matrices for a point light.
     */
    updatePointLightSpaceMatrices(lightId: string, light: IgePointLight): boolean;
    /**
     * Get the atlas viewport offset for a given face index.
     * Layout: row0=[+X(0), -X(1), +Y(2)], row1=[-Y(3), +Z(4), -Z(5)]
     */
    getAtlasFaceOffset(faceIndex: number, faceSize: number): {
        x: number;
        y: number;
    };
    /**
     * Begin rendering to one face of a point light shadow atlas.
     * Binds the atlas framebuffer and sets viewport to the correct face region.
     * On faceIndex 0, clears the entire atlas first.
     */
    beginPointShadowPass(lightId: string, faceIndex: number): boolean;
    /**
     * End a point light shadow face pass.
     */
    endPointShadowPass(): void;
    /**
     * Get a point light shadow map's light-space matrix for a specific face.
     */
    getPointLightSpaceMatrix(lightId: string, faceIndex: number): IgeMatrix4 | null;
    /**
     * Lazily create the full-screen quad VBO for blur passes.
     */
    protected _getQuadBuffer(): WebGLBuffer | null;
    /**
     * Apply a two-pass separable Gaussian blur to a point shadow atlas.
     * Blurs each face independently using scissor test to prevent cross-face bleeding.
     * Pass 1: atlas → blurTexture (horizontal blur, per face)
     * Pass 2: blurTexture → atlas (vertical blur, per face)
     */
    blurPointShadowMap(lightId: string, blurProgram: any): void;
    /**
     * Get point shadow map data for a light.
     */
    getPointShadowMapData(lightId: string): PointShadowMapData | null;
    /**
     * Check if a point light has a shadow map.
     */
    hasPointShadowMap(lightId: string): boolean;
    /**
     * Apply point shadow uniforms to a shader program.
     * @param program Shader program
     * @param shadowIndex Which point shadow slot (0 or 1)
     * @param lightId Light ID
     * @param textureUnit Texture unit to bind the atlas to
     */
    applyPointShadowUniforms(program: IgeWebGlProgram, shadowIndex: number, lightId: string, textureUnit: number): boolean;
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
