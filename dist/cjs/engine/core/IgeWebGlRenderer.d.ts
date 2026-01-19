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
import type { IgeObject } from "./IgeObject.js"
import type { IgeEntity } from "./IgeEntity.js";
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
     * Render model batches.
     */
    protected _renderModelBatches(matrices: any, transparent: boolean): void;
    /**
     * Toggle fullscreen mode.
     */
    toggleFullScreen: () => void;
    /**
     * Clean up and destroy the renderer.
     */
    destroy(): void;
}
