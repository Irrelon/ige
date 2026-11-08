import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import type { IgeEngine } from "./IgeEngine.js";
import type { IgeViewport } from "./IgeViewport.js"
import { IgeWebGlResourceManager } from "../webgl/IgeWebGlResourceManager.js";
import { IgeWebGlShaderManager } from "../webgl/IgeWebGlShaderManager.js"
import { IgeWebGlTextureManager } from "../webgl/IgeWebGlTextureManager.js";
import { IgeWebGlGeometryManager } from "../webgl/IgeWebGlGeometryManager.js"
import { IgeWebGlCameraController } from "../webgl/IgeWebGlCameraController.js";
import { IgeWebGlStateManager } from "../webgl/IgeWebGlStateManager.js"
import { IgeWebGlLightManager } from "../webgl/IgeWebGlLightManager.js";
import { IgeWebGlShadowManager } from "../webgl/IgeWebGlShadowManager.js"
import { IgeWebGlSkeletonManager } from "../webgl/IgeWebGlSkeletonManager.js";
import type { IgeObject } from "./IgeObject.js"
import type { IgeEntity } from "./IgeEntity.js";
import type { IgeDirectionalLight, IgePointLight } from "../webgl/IgeWebGlLight.js"
import type { IgeCameraMatrices } from "../webgl/IgeWebGlCameraController.js";
import type { IgeWebGlProgram } from "../webgl/IgeWebGlProgram.js"
import type { IgeWebGlGeometry } from "../webgl/IgeWebGlGeometry.js";
import type { IgeTexture } from "./IgeTexture.js"
import { IgeMatrix4 } from "./IgeMatrix4.js";
import { IgeFrustum } from "../webgl/IgeFrustum.js"
import { IgeWebGlBonePalette, IgeWebGlInstanceBuffer, IgeWebGlItemBatcher, type IgeWebGlItemBatch, type IgeWebGlRenderItem } from "../webgl/IgeWebGlInstancing.js";
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
import type { IgeModelPart } from "../webgl/IgeModelParts.js"
import type { IgeParticleSystem3d } from "../webgl/IgeParticleSystem3d.js";
import type { IgeMaterialData } from "../../types/IgeMaterialData.js"
import type { IgeSkeleton } from "../../types/IgeSkeletonData.js"
/**
 * Distance fog settings for IgeWebGlRenderer.fog().
 */
export interface IgeWebGlFogSettings {
    mode: "none" | "linear" | "exp2";
    color: {
        r: number;
        g: number;
        b: number;
    };
    /** Linear fog: distance where fog starts. */
    near: number;
    /** Linear fog: distance where fog is fully opaque. */
    far: number;
    /** Exponential fog density (exp2 mode). */
    density: number;
}
/**
 * Per-frame rendering statistics (see IgeWebGlRenderer.stats()).
 */
export interface IgeWebGlRenderStats {
    /** Non-instanced draw calls in the main passes. */
    drawCalls: number;
    /** Instanced draw calls (main and shadow passes). */
    instancedDrawCalls: number;
    /** Meshes drawn through instanced calls. */
    instances: number;
    /** Draw calls issued by shadow passes (instanced calls count once). */
    shadowDrawCalls: number;
    /** Renderable meshes and sprites collected this frame. */
    items: number;
    /** Items that survived camera culling, summed over viewports. */
    visibleItems: number;
    /** Visible items drawn at a lower level of detail, summed over viewports. */
    lodItems: number;
    /** Model triangles submitted by every pass (main, transparent and shadow). */
    triangles: number;
    viewports: number;
}
/**
 * Render items collected for one scene in the current frame.
 */
interface IgeWebGlSceneFrameData {
    frameId: number;
    models: IgeWebGlRenderItem[];
    sprites: IgeEntity[];
    particles: IgeParticleSystem3d[];
}
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
    protected _clearColor: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
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
    protected _cameraController?: IgeWebGlCameraController;
    protected _stateManager?: IgeWebGlStateManager;
    protected _lightManager?: IgeWebGlLightManager;
    protected _shadowManager?: IgeWebGlShadowManager;
    protected _skeletonManager?: IgeWebGlSkeletonManager;
    protected _shadowCastingLight?: IgeDirectionalLight;
    protected _shadowLightId: string;
    protected _shadowDebugMode: number;
    protected _shadowCastingPointLights: IgePointLight[];
    protected _frameId: number;
    protected _itemPool: IgeWebGlRenderItem[];
    protected _itemCount: number;
    protected _sceneData: WeakMap<IgeObject, IgeWebGlSceneFrameData>;
    protected _skeletonRows: Map<IgeSkeleton, number>;
    protected _mainBatcher: IgeWebGlItemBatcher;
    protected _depthBatcher: IgeWebGlItemBatcher;
    protected _transparentItems: IgeWebGlRenderItem[];
    protected _opaqueSprites: IgeEntity[];
    protected _transparentSprites: IgeEntity[];
    protected _maxPixelRatio: number;
    protected _shadowShareThreshold: number;
    protected _sharedShadowFrame: number;
    protected _pendingBlobTextures: Set<string>;
    protected _particleBuffers: Map<IgeParticleSystem3d, {
        buffer: WebGLBuffer | null;
        version: number;
        lastFrame: number;
    }>;
    protected _defaultParticleTexture: WebGLTexture | null;
    protected _lightFrustum: IgeFrustum;
    protected _lightFrustumMatrix: IgeMatrix4;
    protected _instancingEnabled: boolean;
    protected _minInstanceCount: number;
    protected _instanceBuffer?: IgeWebGlInstanceBuffer;
    protected _bonePalette?: IgeWebGlBonePalette;
    protected _fog: IgeWebGlFogSettings;
    protected _stats: IgeWebGlRenderStats;
    protected _lodBias: number;
    protected _preserveDrawingBuffer: boolean;
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
     * Set the background clear colour used for the canvas and each viewport.
     * Components are 0..1. Defaults to opaque black.
     *
     * Each viewport's area is cleared to this colour (including alpha) before
     * it is drawn, so split-screen viewports all share the same background.
     */
    setClearColor(r: number, g: number, b: number, a?: number): this;
    /**
     * Gets / sets distance fog applied by the lit shaders. Distance is
     * measured from each viewport's camera, so every split-screen view fades
     * relative to its own camera.
     * @example #Linear fog that starts 600 units from the camera
     *     renderer.fog({ mode: "linear", color: { r: 0.05, g: 0.06, b: 0.08 }, near: 600, far: 1400 });
     * @example #Disable fog
     *     renderer.fog({ mode: "none" });
     */
    fog(): IgeWebGlFogSettings;
    fog(settings: Partial<IgeWebGlFogSettings>): this;
    /**
     * Gets / sets whether batches of identical meshes are drawn with GPU
     * instancing (one draw call per batch). Requires WebGL 2; ignored on
     * WebGL 1 where every mesh is drawn individually.
     */
    instancing(): boolean;
    instancing(val: boolean): this;
    /**
     * Gets / sets the level-of-detail bias. On-screen sizes are multiplied
     * by it before an entity's LOD level is picked (see IgeEntity.lod()):
     * above 1 keeps full detail longer, below 1 switches to lower detail
     * sooner. Useful as a graphics quality setting. Defaults to 1.
     */
    lodBias(): number;
    lodBias(val: number): this;
    /**
     * Gets / sets the highest device pixel ratio the canvas renders at.
     * High-DPI screens can make split-screen fill-rate bound (four
     * viewports at 2x is 6.5 million pixels per frame on a 1728x935
     * window); capping at e.g. 1.5 trades a little sharpness for speed.
     * Defaults to no cap.
     */
    maxPixelRatio(): number;
    maxPixelRatio(val: number): this;
    /**
     * Project a world-space point into a viewport. Returns CSS pixel
     * coordinates relative to the canvas's top-left corner, e.g. to place
     * a DOM health bar or damage number over an entity.
     * `visible` is false when the point is behind the camera or outside
     * the viewport. Returns null if the viewport has no camera.
     * @example #Position a health bar above a zombie in player 2's view
     *     const p = renderer.worldToScreen(viewport2, zombie._translate.x, 200, zombie._translate.z);
     *     if (p && p.visible) { bar.style.transform = `translate(${p.x}px, ${p.y}px)`; }
     */
    worldToScreen(viewport: IgeViewport, x: number, y: number, z: number): {
        x: number;
        y: number;
        depth: number;
        visible: boolean;
    } | null;
    /**
     * Build a world-space ray through a screen point (CSS pixels from the
     * canvas's top-left) in a viewport, for mouse picking and aiming.
     * Returns null if the viewport has no camera.
     */
    screenToWorldRay(viewport: IgeViewport, screenX: number, screenY: number): {
        origin: {
            x: number;
            y: number;
            z: number;
        };
        direction: {
            x: number;
            y: number;
            z: number;
        };
    } | null;
    /**
     * Where a screen point (CSS pixels from the canvas's top-left) hits the
     * horizontal plane y = groundY in a viewport, e.g. for click-to-move or
     * mouse aiming. Returns null if the ray doesn't hit the plane.
     */
    screenToGround(viewport: IgeViewport, screenX: number, screenY: number, groundY?: number): {
        x: number;
        y: number;
        z: number;
    } | null;
    /**
     * The viewport under a screen point (CSS pixels from the canvas's
     * top-left), e.g. to route mouse input in split screen. The topmost
     * (last mounted) viewport wins when viewports overlap.
     */
    viewportAt(screenX: number, screenY: number): IgeViewport | undefined;
    /**
     * Gets / sets when split-screen viewports share one directional shadow
     * map instead of rendering one each. If every viewport's camera target
     * fits within this fraction of the shadow frustum size (see
     * shadowManager.frustumSize()), a single map, enlarged to cover them
     * all, is rendered once per frame. Co-op players usually stay close, so
     * this often turns four shadow passes into one. 0 disables sharing.
     * Defaults to 0.35.
     */
    shadowSharing(): number;
    shadowSharing(threshold: number): this;
    /**
     * If all viewports share a scene and their camera targets are close
     * together, render one directional shadow map covering them all.
     * Returns true when the shared map was rendered for this frame.
     */
    protected _renderSharedShadowMap(viewports: IgeViewport[]): boolean;
    /**
     * Id of the most recently rendered frame. Compare with an object's
     * _lastRenderedFrame to tell whether it was drawn last frame.
     */
    frameId(): number;
    /**
     * Per-frame rendering statistics for the most recent frame.
     */
    stats(): IgeWebGlRenderStats;
    /**
     * Main scene graph rendering method.
     * Called once per frame by the engine.
     *
     * Work that does not depend on the camera (transforms, skeleton
     * matrices, the bone palette and point light shadow maps) is done once
     * per frame here; each viewport then only culls, renders its directional
     * shadow map and draws its view.
     */
    renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean;
    /**
     * Walk a scene graph once, refreshing transforms and turning every
     * renderable entity into pooled render items with world-space bounds.
     */
    protected _collectRenderables(obj: IgeObject, data: IgeWebGlSceneFrameData, isSceneRoot?: boolean): void;
    /**
     * Add one render item per part of an entity's model. Parts with their
     * own node transform get a world matrix of entity world * part matrix,
     * kept in a per-entity buffer; the rest share the entity's matrix. The
     * entity's own _materialData (if any) overrides the parts' materials.
     */
    protected _addModelParts(entity: IgeEntity, parts: IgeModelPart[], data: IgeWebGlSceneFrameData): void;
    /**
     * Start uploading a model texture image (once); it is used as soon as
     * the upload completes.
     */
    protected _requestBlobTexture(textureId: string, blob: Blob): void;
    /**
     * Create (or reuse) a pooled render item for one mesh of an entity.
     * @param materialData The mesh's material.
     * @param overrideData Optional per-entity material values that replace
     * the mesh material's (used for model parts).
     * @param worldMatrix World matrix to draw with (defaults to the entity's).
     * @param lodGeometryData Lower-detail versions of the mesh, if any.
     * @param lodSizes Screen sizes below which each lower level is used.
     */
    protected _addModelItem(entity: IgeEntity, geometryData: IgeGeometryData3d, materialData: IgeMaterialData | null, overrideData?: IgeMaterialData | null, worldMatrix?: Float32Array | undefined, lodGeometryData?: IgeGeometryData3d[] | null, lodSizes?: number[] | null): IgeWebGlRenderItem | undefined;
    /**
     * Get the GPU geometry for geometry data, uploading it on first use.
     */
    protected _getGeometry(geometryData: IgeGeometryData3d): IgeWebGlGeometry | undefined;
    /**
     * Pick an item's level of detail for a pass that draws it at
     * `pixelsPerUnit` (device pixels or shadow map texels per world unit).
     */
    protected _lodLevel(item: IgeWebGlRenderItem, pixelsPerUnit: number): number;
    /**
     * Add a draw's triangle count to the frame stats.
     */
    protected _countTriangles(geometry: IgeWebGlGeometry, instances: number): void;
    /**
     * Copy the values present in a material onto a render item's resolved
     * material (fields that are absent are left unchanged).
     */
    protected _applyMaterialData(item: IgeWebGlRenderItem, materialData: IgeMaterialData): void;
    /**
     * Render a single viewport.
     */
    protected _renderViewport(viewport: IgeViewport): void;
    /**
     * Pick the program for a model batch.
     */
    protected _selectProgram(skinned: boolean, instanced: boolean, baseId: string, skinnedId: string): IgeWebGlProgram | undefined;
    /**
     * Whether a batch should be drawn with a single instanced call.
     */
    protected _shouldInstance(batch: IgeWebGlItemBatch): boolean;
    /**
     * Draw a batch with one instanced call (geometry must already be bound).
     */
    protected _drawInstanced(batch: IgeWebGlItemBatch, program: IgeWebGlProgram): void;
    /**
     * Point an instanced skinned program at the bone palette texture.
     */
    protected _bindBonePalette(program: IgeWebGlProgram): void;
    /**
     * Upload one item's bone matrices to a non-instanced skinned program.
     */
    protected _uploadBoneUniforms(program: IgeWebGlProgram, item: IgeWebGlRenderItem): void;
    /**
     * Draw depth-only batches (shadow passes). `setup` applies the pass's
     * shared uniforms whenever the active program changes.
     */
    protected _drawDepthBatches(batches: IgeWebGlItemBatch[], baseId: string, skinnedId: string, setup: (program: IgeWebGlProgram) => void): void;
    /**
     * Render the directional light's shadow map for one viewport. Casters
     * are culled against the light's own frustum (not the camera's), so
     * objects just off-screen still cast shadows into view.
     */
    protected _renderDirectionalShadowPass(data: IgeWebGlSceneFrameData, lightSpaceMatrix: Float32Array): void;
    /**
     * Render point light shadow atlases (6 faces per shadow-casting light).
     * Runs once per frame; casters are every shadow-casting item in range of
     * the light across all scenes being rendered.
     */
    protected _renderPointLightShadowPasses(): void;
    /**
     * Set the per-viewport uniforms a lit program needs (camera, lights,
     * shadows, fog). Called whenever the active program changes.
     */
    protected _setupLitProgram(program: IgeWebGlProgram, matrices: IgeCameraMatrices): void;
    /**
     * Bind the base colour texture for a batch or item to unit 0.
     */
    protected _bindBaseTexture(blobTextureId: string | undefined, texture: IgeTexture | undefined): void;
    /**
     * Set one item's per-draw uniforms on a non-instanced lit program.
     */
    protected _applyItemUniforms(program: IgeWebGlProgram, item: IgeWebGlRenderItem): void;
    /**
     * Render opaque model batches with the lit shaders, instancing where
     * possible. Supports skinned meshes with skeletal animation.
     */
    protected _renderModelBatches(batches: IgeWebGlItemBatch[], matrices: IgeCameraMatrices): void;
    /**
     * Render transparent model items one at a time in back-to-front order.
     */
    protected _renderTransparentItems(items: IgeWebGlRenderItem[], matrices: IgeCameraMatrices): void;
    /**
     * Upload a particle system's packed render data to its own GPU buffer
     * (once per frame, only when it changed). Buffers of systems that
     * haven't been seen for a while are deleted.
     */
    protected _uploadParticleSystem(system: IgeParticleSystem3d): void;
    /**
     * A soft round white dot, used by particle systems without a texture.
     */
    protected _getDefaultParticleTexture(): WebGLTexture | null;
    /**
     * Draw particle systems as camera-facing quads: one instanced call per
     * system (WebGL 2) or one call per particle (WebGL 1). Drawn after the
     * transparent pass with depth testing but no depth writes.
     */
    protected _renderParticleSystems(systems: IgeParticleSystem3d[], matrices: IgeCameraMatrices): void;
    /**
     * Render 2D sprites (textured quads, billboarded to face the camera).
     */
    protected _renderSprites(sprites: IgeEntity[], matrices: IgeCameraMatrices): void;
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
     * Enable shadow casting for a point light.
     * Maximum of 2 shadow-casting point lights supported.
     * @param light The point light to cast shadows
     * @param shadowMapSize Size of each shadow map face (default: 512)
     */
    enablePointLightShadows(light: IgePointLight, shadowMapSize?: number): boolean;
    /**
     * Disable shadow casting for a specific point light.
     */
    disablePointLightShadows(light: IgePointLight): void;
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
     * Gets / sets whether the WebGL drawing buffer should be preserved after
     * compositing. When true, gl.readPixels() works after a frame is rendered.
     * Must be called before createFrontBuffer().
     */
    preserveDrawingBuffer(): boolean;
    preserveDrawingBuffer(val: boolean): this;
    /**
     * Read the RGBA color of a single pixel at the given screen coordinates.
     * Requires preserveDrawingBuffer to be true (set before context creation).
     * @param x Screen X coordinate (0 = left edge)
     * @param y Screen Y coordinate (0 = top edge, DOM convention)
     * @returns Uint8Array [R, G, B, A] or null if context unavailable
     */
    readPixel(x: number, y: number): Uint8Array | null;
    /**
     * Read all pixels from the current framebuffer.
     * Requires preserveDrawingBuffer to be true.
     * Returns pixel data in WebGL native format (bottom-left origin, RGBA).
     */
    readAllPixels(): Uint8Array | null;
    /**
     * Returns the underlying WebGL rendering context, if available.
     */
    glContext(): WebGLRenderingContext | WebGL2RenderingContext | null | undefined;
    /**
     * Clean up and destroy the renderer.
     */
    destroy(): void;
}
export {};
