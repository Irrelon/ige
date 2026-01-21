import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import type { IgeEngine } from "./IgeEngine.js";
import type { IgeViewport } from "./IgeViewport.js"
import { IgeWebGlResourceManager } from "../webgl/IgeWebGlResourceManager.js";
import { IgeWebGlShaderManager } from "../webgl/IgeWebGlShaderManager.js"
import { IgeWebGlTextureManager } from "../webgl/IgeWebGlTextureManager.js";
import { IgeWebGlGeometryManager } from "../webgl/IgeWebGlGeometryManager.js"
import { IgeWebGlCameraController } from "../webgl/IgeWebGlCameraController.js";
import { IgeWebGlRenderBatchManager } from "../webgl/IgeWebGlRenderBatchManager.js"
import { IgeWebGlStateManager } from "../webgl/IgeWebGlStateManager.js";
import { IgeWebGlLightManager } from "../webgl/IgeWebGlLightManager.js"
import { IgeWebGlShadowManager } from "../webgl/IgeWebGlShadowManager.js";
import { IgeWebGlSkeletonManager } from "../webgl/IgeWebGlSkeletonManager.js"
import type { IgeObject } from "./IgeObject.js";
import type { IgeEntity } from "./IgeEntity.js"
import type { IgeDirectionalLight } from "../webgl/IgeWebGlLight.js";
/**
 * Custom WebGL renderer for IGE supporting full 3D rendering.
 * This renderer replaces the experimental three.js integration with
 * a purpose-built WebGL system for maximum control and performance.
 */
export declare class IgeWebGlRenderer extends IgeBaseRenderer {
    classId: string;
    protected _canvasContext?: WebGLRenderingContext | WebGL2RenderingContext | null;
    protected _webglVersion: 1 | 2;
    protected _contextLost: boolean;
    protected _capabilities: {
        maxTextureSize: number;
        maxVertexAttribs: number;
        maxVaryingVectors: number;
        maxVertexTextureImageUnits: number;
        maxTextureImageUnits: number;
        maxCombinedTextureImageUnits: number;
        maxVertexUniformVectors: number;
        maxFragmentUniformVectors: number;
        supportsInstancedArrays: boolean;
        supportsVertexArrayObjects: boolean;
        supportsDepthTexture: boolean;
        supportsFloatTextures: boolean;
    };
    protected _resourceManager?: IgeWebGlResourceManager;
    protected _shaderManager?: IgeWebGlShaderManager;
    protected _textureManager?: IgeWebGlTextureManager;
    protected _geometryManager?: IgeWebGlGeometryManager;
    protected _renderBatchManager?: IgeWebGlRenderBatchManager;
    protected _cameraController?: IgeWebGlCameraController;
    protected _stateManager?: IgeWebGlStateManager;
    protected _lightManager?: IgeWebGlLightManager;
    protected _shadowManager?: IgeWebGlShadowManager;
    protected _skeletonManager?: IgeWebGlSkeletonManager;
    protected _shadowCastingLight?: IgeDirectionalLight;
    protected _shadowLightId: string;
    protected _shadowDebugMode: number;
    /**
     * Initialize the WebGL renderer.
     */
    _setup(): Promise<void>;
    /**
     * Creates a WebGL canvas front buffer.
     */
    createFrontBuffer(autoSize?: boolean, dontScale?: boolean): void;
    /**
     * Gets / sets the canvas element and creates WebGL context.
     */
    canvasElement(elem?: HTMLCanvasElement, autoSize?: boolean): HTMLCanvasElement | undefined;
    /**
     * Compile built-in shaders from the shader library.
     */
    protected _compileBuiltInShaders(): void;
    /**
     * Query WebGL capabilities and store them.
     */
    protected _queryCapabilities(): void;
    /**
     * Handle canvas resize events.
     */
    _resizeEvent: (event?: Event) => void;
    /**
     * Handle WebGL context loss.
     */
    protected _handleContextLost: (event: Event) => void;
    /**
     * Handle WebGL context restoration.
     */
    protected _handleContextRestored: () => void;
    /**
     * Main scene graph rendering method.
     * Called once per frame by the engine.
     */
    renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean;
    /**
     * Render a single viewport.
     */
    protected _renderViewport(viewport: IgeViewport): void;
    /**
     * Render shadow pass - renders scene from light's perspective to shadow map.
     */
    protected _renderShadowPass(matrices: any, cameraPos: {
        x: number;
        y: number;
        z: number;
    }): void;
    /**
     * Traverse the scene graph and add entities to render batches.
     */
    protected _traverseSceneGraph(entity: IgeObject, camera: any, frustum: any): void;
    /**
     * Check if an entity is renderable (has texture or geometry with actual vertex data).
     */
    protected _isRenderableEntity(entity: IgeObject): boolean;
    /**
     * Add an entity to the appropriate render batch.
     */
    protected _addEntityToBatch(entity: IgeEntity): void;
    /**
     * Render all opaque batches.
     */
    protected _renderOpaqueBatches(matrices: any, viewport: IgeViewport): void;
    /**
     * Render all transparent batches.
     */
    protected _renderTransparentBatches(matrices: any, viewport: IgeViewport): void;
    /**
     * Render sprite batches.
     */
    protected _renderSpriteBatches(matrices: any, transparent: boolean): void;
    /**
     * Render model batches using lit shader with full lighting support.
     * Falls back to simple model shader if lit shader is not available.
     * Supports skinned meshes with skeletal animation.
     */
    protected _renderModelBatches(matrices: any, transparent: boolean): void;
    /**
     * Get the light manager for adding/removing scene lights.
     */
    get lightManager(): IgeWebGlLightManager | undefined;
    /**
     * Get the shadow manager for shadow configuration.
     */
    get shadowManager(): IgeWebGlShadowManager | undefined;
    /**
     * Get the skeleton manager for skeletal animation.
     */
    get skeletonManager(): IgeWebGlSkeletonManager | undefined;
    /**
     * Enable shadow casting for a directional light.
     * @param light The directional light to cast shadows
     * @param shadowMapSize Size of the shadow map texture (default: 1024)
     */
    enableShadows(light: IgeDirectionalLight, shadowMapSize?: number): boolean;
    /**
     * Disable shadow casting.
     */
    disableShadows(): void;
    /**
     * Check if shadows are enabled.
     */
    shadowsEnabled(): boolean;
    /**
     * Get or set shadow debug mode.
     * 0 = normal rendering
     * 1 = visualize projected UV coordinates
     * 2 = visualize fragment depth in light space
     * 3 = visualize sampled shadow map depth
     * 4 = visualize depth comparison (red=shadow, green=lit)
     */
    shadowDebugMode(mode?: number): number | this;
    /**
     * Toggle fullscreen mode.
     */
    toggleFullScreen: () => void;
    /**
     * Clean up and destroy the renderer.
     */
    destroy(): void;
}
