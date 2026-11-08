import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import { IgeDummyContext } from "./IgeDummyContext.js";
import type { IgeEngine } from "./IgeEngine.js"
import type { IgeViewport } from "./IgeViewport.js";
import { IgeWebGlResourceManager } from "../webgl/IgeWebGlResourceManager.js"
import { IgeWebGlShaderManager } from "../webgl/IgeWebGlShaderManager.js";
import { IgeWebGlTextureManager } from "../webgl/IgeWebGlTextureManager.js"
import { IgeWebGlGeometryManager } from "../webgl/IgeWebGlGeometryManager.js";
import { IgeWebGlCameraController } from "../webgl/IgeWebGlCameraController.js"
import { IgeWebGlStateManager } from "../webgl/IgeWebGlStateManager.js";
import { IgeWebGlLightManager } from "../webgl/IgeWebGlLightManager.js"
import { IgeWebGlShadowManager } from "../webgl/IgeWebGlShadowManager.js";
import { IgeWebGlSkeletonManager } from "../webgl/IgeWebGlSkeletonManager.js"
import type { IgeObject } from "./IgeObject.js";
import type { IgeEntity } from "./IgeEntity.js"
import type { IgeDirectionalLight, IgePointLight } from "../webgl/IgeWebGlLight.js";
import type { IgeCameraMatrices } from "../webgl/IgeWebGlCameraController.js"
import type { IgeWebGlProgram } from "../webgl/IgeWebGlProgram.js";
import type { IgeWebGlGeometry } from "../webgl/IgeWebGlGeometry.js"
import type { IgeTexture } from "./IgeTexture.js";
import { IgeMatrix4 } from "./IgeMatrix4.js"
import { IgeFrustum } from "../webgl/IgeFrustum.js";
import { IgeWebGlBonePalette, IgeWebGlInstanceBuffer, IgeWebGlItemBatcher, type IgeWebGlItemBatch, type IgeWebGlRenderItem } from "../webgl/IgeWebGlInstancing.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js";
import type { IgeModelPart } from "../webgl/IgeModelParts.js"
import type { IgeParticleSystem3d } from "../webgl/IgeParticleSystem3d.js";
import type { IgeDecalSystem3d } from "../webgl/IgeDecalSystem3d.js"
import type { IgeRaycastHit, IgeRaycastOptions } from "../webgl/IgeRaycast.js";
import type { IgeHeightfieldRayOptions } from "../webgl/IgeHeightfieldRay.js"
import type { IgeMaterialData } from "../../types/IgeMaterialData.js";
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
    /** Times the cached static shadow casters were redrawn (see shadowCaching()). */
    shadowCacheRebuilds: number;
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
    decals: IgeDecalSystem3d[];
}
/** Anything that supplies packed per-instance data (particles, decals). */
interface IgeWebGlInstanceSource {
    renderData(): {
        data: Float32Array;
        count: number;
    };
    _renderVersion: number;
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
    protected _particleBuffers: Map<IgeWebGlInstanceSource, {
        buffer: WebGLBuffer | null;
        version: number;
        lastFrame: number;
    }>;
    protected _decalMeshBuffers: Map<IgeDecalSystem3d, {
        buffer: WebGLBuffer | null;
        version: number;
        lastFrame: number;
    }>;
    /** Passed to entity preTick behaviours, which expect a Canvas 2D context. */
    protected _tickContext: IgeDummyContext;
    protected _defaultParticleTexture: WebGLTexture | null;
    protected _defaultDecalTexture: WebGLTexture | null;
    protected _lightFrustum: IgeFrustum;
    protected _pointCasterItems: IgeWebGlRenderItem[];
    protected _pointCasterKeys: string[];
    protected _pointCasterGeometries: IgeWebGlGeometry[];
    protected _lightFrustumMatrix: IgeMatrix4;
    protected _instancingEnabled: boolean;
    protected _minInstanceCount: number;
    protected _instanceBuffer?: IgeWebGlInstanceBuffer;
    protected _bonePalette?: IgeWebGlBonePalette;
    protected _fog: IgeWebGlFogSettings;
    protected _stats: IgeWebGlRenderStats;
    protected _lodBias: number;
    protected _backFaceCulling: boolean;
    protected _shadowCaching: boolean;
    protected _staticDepthBatcher: IgeWebGlItemBatcher;
    protected _shadowMapHoldsCache: boolean;
    protected _directionalPassesThisFrame: number;
    protected _directionalPassesLastFrame: number;
    protected _preserveDrawingBuffer: boolean;
    protected _preferredWebGlVersion: 1 | 2;
    protected _debugOptions: {
        bounds: boolean;
        shadowFrustum: boolean;
    };
    protected _debugLineData: Float32Array;
    protected _debugLineVertices: number;
    protected _debugLineBuffer: WebGLBuffer | null;
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
     * Free the GPU buffers of a geometry, e.g. a terrain chunk that was
     * rebuilt or a level that was unloaded, along with any LOD meshes
     * generated from it. Pass the geometry data or its id. If an entity
     * still draws the geometry it is simply uploaded again on its next
     * frame, so releasing too early costs time but doesn't break anything.
     */
    releaseGeometry(geometry: IgeGeometryData3d | string): this;
    /**
     * Free a geometry's arrays (vertices, normals, uvs, colours, indices,
     * skin data) once it is on the GPU, so the GPU copy is the only one:
     * for large meshes the game never reads again, such as terrain chunks.
     * Uploads it first if it hasn't been drawn yet, and keeps its bounding
     * box for culling and pointer events.
     *
     * Nothing can rebuild the mesh afterwards: generate LOD levels first
     * (call lod() before this), releaseGeometry() frees it for good, and
     * triangle picking, raycasts, projected decals and physics mesh shapes
     * skip it. Returns false if the geometry couldn't be uploaded.
     * @example #Keep only the GPU copy of a terrain chunk
     *     chunk.geometry(chunkMesh);
     *     renderer.discardGeometryArrays(chunkMesh);
     */
    discardGeometryArrays(geometryData: IgeGeometryData3d): boolean;
    /**
     * Free the GPU copy of a texture (an IgeTexture, or the id of a model
     * texture). IgeTexture.destroy() does this automatically. A texture
     * that is still used is uploaded again when next drawn.
     */
    releaseTexture(texture: IgeTexture | string): this;
    /**
     * Gets / sets whether static shadow casters are cached (default false,
     * WebGL 2 only). Meshes that aren't skinned and haven't moved for 30
     * rendered frames (new meshes count as unmoved) are drawn into a cached
     * depth map, which is redrawn only when
     * one of them moves, appears or disappears, or the shadow frustum
     * moves. Each frame copies the cache into the shadow map and draws only
     * the moving casters (characters, projectiles) on top, so large static
     * scenes such as terrain stop costing shadow draw calls.
     *
     * To keep the frustum still while the camera pans, it re-centres in
     * steps of 1/8 of shadowManager.frustumSize() instead of following the
     * camera exactly, so the area covered may lag the view by that much;
     * allow for it in the frustum size. Caching pauses on frames where
     * split-screen views each render their own shadow map (it helps when
     * there is one view or the views share a map).
     */
    shadowCaching(): boolean;
    shadowCaching(val: boolean): this;
    /**
     * Where the directional shadow frustum should be centred for a view
     * target: the target itself, or with shadow caching on, the target
     * snapped to a coarse grid so small camera moves don't move the frustum.
     */
    protected _shadowCenter(x: number, y: number, z: number): {
        x: number;
        y: number;
        z: number;
    };
    /**
     * Gets / sets debug drawing, drawn on top of each viewport:
     * - bounds: every visible mesh's bounding sphere (the one used for
     *   culling), coloured by the level of detail picked in that view:
     *   green full detail, then yellow, orange and red for lower levels;
     *   blue for meshes without LOD levels;
     * - shadowFrustum: the box the directional shadow map covers.
     * @example #Check LOD switching and shadow coverage
     *     renderer.debugDraw({ bounds: true, shadowFrustum: true });
     */
    debugDraw(): {
        bounds: boolean;
        shadowFrustum: boolean;
    };
    debugDraw(options: Partial<{
        bounds: boolean;
        shadowFrustum: boolean;
    }>): this;
    /**
     * Draw a world-space line in every viewport on the next rendered frame,
     * e.g. an AI path, an attack range or a ray. Call it each frame the line
     * should stay visible.
     * @param color RGBA, 0-1 (default yellow).
     */
    debugLine(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color?: {
        r: number;
        g: number;
        b: number;
        a?: number;
    }): this;
    protected _pushDebugLine(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, r: number, g: number, b: number, a: number): void;
    /** Three great circles approximating a sphere. */
    protected _pushDebugSphere(cx: number, cy: number, cz: number, radius: number, color: [number, number, number]): void;
    /**
     * Draw this viewport's debug lines: lines queued with debugLine() plus,
     * when enabled, bounds and the shadow frustum (generated per viewport
     * and dropped again afterwards).
     */
    protected _renderDebugLines(matrices: IgeCameraMatrices): void;
    /**
     * Gets / sets whether back faces of opaque meshes are culled in the
     * main pass (default false). Culling skips triangles facing away from
     * the camera, roughly halving the fragments shaded for closed meshes
     * such as terrain and characters. Meshes must be wound counter-
     * clockwise (glTF and IgePrimitiveGeometry are); materials with
     * doubleSided: true are never culled. Entities with a negative scale
     * (mirrored) turn inside out when culling is on.
     */
    backFaceCulling(): boolean;
    backFaceCulling(val: boolean): this;
    /**
     * Find where a screen point's ray first meets a heightfield, for
     * picking on uneven terrain (screenToGround() only meets a flat plane).
     * The ray is sampled every `step` world units (horizontally) through
     * the height band [minHeight, maxHeight], then the hit is refined by
     * bisection, so `step` only needs to be small enough not to jump over
     * narrow peaks. Returns null if the ray misses the band or the ground.
     * @param heightAt Ground height at a world X/Z position.
     * @example #Pick a hex tile on hilly terrain
     *     const hit = renderer.screenToHeightfield(viewport, x, y, (wx, wz) => terrain.heightAt(wx, wz), {
     *         minHeight: 0, maxHeight: 120, step: 4
     *     });
     */
    screenToHeightfield(viewport: IgeViewport, screenX: number, screenY: number, heightAt: (x: number, z: number) => number, options: IgeHeightfieldRayOptions): {
        x: number;
        y: number;
        z: number;
    } | null;
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
     * The view, projection and combined matrices (and frustum) a viewport's
     * camera renders with, for projecting many points without repeating
     * the camera setup (see IgeViewportOverlay). Null without a camera.
     */
    cameraMatrices(viewport: IgeViewport): IgeCameraMatrices | null;
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
     * The nearest mesh triangle under a screen point (CSS pixels from the
     * canvas's top-left) in a viewport: which entity was clicked, and
     * exactly where (point, surface normal, distance). Tests the given
     * entities and their children, or the viewport's whole scene; skinned
     * characters are tested in their current pose. Sprites aren't tested.
     * @example #Click to attack a zombie or move to a point on the terrain
     *     const hit = renderer.raycast(viewport, event.clientX, event.clientY);
     *     if (hit?.entity.data("zombie")) attack(hit.entity);
     *     else if (hit) moveTo(hit.point);
     */
    raycast(viewport: IgeViewport, screenX: number, screenY: number, targets?: IgeEntity | IgeEntity[], options?: IgeRaycastOptions): IgeRaycastHit | null;
    /**
     * Gets / sets how entity pointer events (pointerOver, pointerDown...)
     * test meshes: "box" (default) against their bounding box, which is
     * cheap but also catches the empty space around a shape; "triangles"
     * against the actual triangles (skinned characters in their current
     * pose), after the box test passes. Sprites are always tested by their
     * quad.
     */
    pointerPicking(): "box" | "triangles";
    pointerPicking(mode: "box" | "triangles"): this;
    protected _pointerPicking: "box" | "triangles";
    /**
     * Whether a screen point (CSS pixels from the canvas's top-left) is over
     * an entity in the viewport under it. IGE's pointer events (pointerOver,
     * pointerDown, pointerUp...) use this when the WebGL renderer is active.
     * Meshes are hit by their bounding box, or by their triangles with
     * pointerPicking("triangles"); sprites exactly by their quad in flat
     * views (screen2d, or billboard("none")), or by their on-screen
     * rectangle when billboarded.
     */
    pointerHitTest(entity: IgeEntity, screenX: number, screenY: number): boolean;
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
    /**
     * Give a viewport's camera the default preset (see defaultCameraPreset())
     * if the game hasn't set one up.
     */
    protected _applyDefaultCameraPreset(viewport: IgeViewport): void;
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
     * Upload a particle or decal system's packed render data to its own
     * GPU buffer (once per frame, only when it changed). Buffers of systems
     * that haven't been seen for a while are deleted.
     */
    protected _uploadInstanceData(system: IgeWebGlInstanceSource, floatsPerInstance: number): void;
    /**
     * A soft round white dot, used by particle systems without a texture.
     */
    protected _getDefaultParticleTexture(): WebGLTexture | null;
    /**
     * The built-in decal texture: a 2x2 atlas of white splats (alpha is the
     * shape) for IgeDecalSystem3d without a texture of its own. Generated
     * from a fixed seed so every run looks the same.
     */
    protected _getDefaultDecalTexture(): WebGLTexture | null;
    /**
     * Draw decal systems as quads lying on the ground: one instanced call
     * per system (WebGL 2) or one call per decal (WebGL 1). Drawn after the
     * opaque pass with depth testing, no depth writes and a polygon offset
     * so they never fight with the ground they lie on.
     */
    protected _renderDecalSystems(systems: IgeDecalSystem3d[], matrices: IgeCameraMatrices): void;
    /**
     * Draw projected decals (IgeDecalSystem3d.project()): each system's
     * decal triangles are one world-space vertex buffer and one draw call.
     */
    protected _renderProjectedDecals(systems: IgeDecalSystem3d[], matrices: IgeCameraMatrices): void;
    /**
     * Draw particle systems as camera-facing quads: one instanced call per
     * system (WebGL 2) or one call per particle (WebGL 1). Drawn after the
     * transparent pass with depth testing but no depth writes.
     */
    protected _renderParticleSystems(systems: IgeParticleSystem3d[], matrices: IgeCameraMatrices): void;
    /**
     * Render 2D sprites (textured quads, billboarded to face the camera).
     */
    protected _renderSprites(sprites: IgeEntity[], matrices: IgeCameraMatrices, flat2d?: boolean): void;
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
     * Gets / sets the WebGL version to ask for (default 2, falling back to
     * 1 when unavailable). Set it to 1 before createFrontBuffer() to run the
     * WebGL 1 path on a WebGL 2 machine, e.g. to test the fallback.
     */
    preferredWebGlVersion(): 1 | 2;
    preferredWebGlVersion(val: 1 | 2): this;
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
