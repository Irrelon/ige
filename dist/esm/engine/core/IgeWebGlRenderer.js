import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import { IgeTextureRenderMode } from "../../enums/index.js"
import { markSceneChanged } from "../utils/sceneChange.js"
import { IgePoint2d } from "./IgePoint2d.js"
import { ige } from "../instance.js"
import { isClient, isServer } from "../utils/clientServer.js"
import { IgeWebGlResourceManager } from "../webgl/IgeWebGlResourceManager.js"
import { IgeWebGlShaderManager } from "../webgl/IgeWebGlShaderManager.js"
import { IgeWebGlTextureManager } from "../webgl/IgeWebGlTextureManager.js"
import { IgeWebGlGeometryManager } from "../webgl/IgeWebGlGeometryManager.js"
import { IgeWebGlCameraController } from "../webgl/IgeWebGlCameraController.js"
import { IgeWebGlStateManager } from "../webgl/IgeWebGlStateManager.js"
import { IgeWebGlLightManager } from "../webgl/IgeWebGlLightManager.js"
import { IgeWebGlShadowManager } from "../webgl/IgeWebGlShadowManager.js"
import { IgeWebGlSkeletonManager } from "../webgl/IgeWebGlSkeletonManager.js"
import { IgeShaderLibrary } from "../shaders/webgl/shaderLibrary.js"
import { IgeMatrix4 } from "./IgeMatrix4.js"
import { IgeFrustum } from "../webgl/IgeFrustum.js"
import { IgeWebGlBonePalette, IgeWebGlInstanceBuffer, IgeWebGlItemBatcher } from "../webgl/IgeWebGlInstancing.js"
import { DECAL_INSTANCE_FLOATS, DECAL_MESH_VERTEX_FLOATS } from "../webgl/IgeDecalSystem3d.js"
import { raycastEntities } from "../webgl/IgeRaycast.js"
import { takeGeneratedLods } from "../webgl/IgeModelParts.js"
import { intersectHeightfield } from "../webgl/IgeHeightfieldRay.js"
import { MAX_BONES } from "../../types/IgeSkeletonData.js"
/** Texture unit layout used by the lit shaders. */
const SHADOW_TEXTURE_UNIT = 1;
const POINT_SHADOW_TEXTURE_UNIT = 2; // 2 and 3
const BONE_TEXTURE_UNIT = 4;
const IDENTITY_MATRIX = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
]);
/** Floats per particle in IgeParticleSystem3d.renderData(). */
const PARTICLE_FLOATS = 8;
/**
 * Frames an entity's transform must stay unchanged before it is treated as
 * a static shadow caster (see shadowCaching()).
 */
const SHADOW_STATIC_FRAMES = 30;
/** Fraction of the shadow frustum's half-size the cached frustum re-centres by. */
const SHADOW_RECENTER_STEP = 0.125;
let nextRenderUid = 1;
/** Local-space bounding boxes for pointer picking (cached per geometry and model). */
const geometryBoxCache = new WeakMap();
const partsBoxCache = new WeakMap();
function geometryBox(data) {
    let box = geometryBoxCache.get(data);
    if (box)
        return box;
    if (data.boundingBox) {
        const [minX, minY, minZ] = data.boundingBox.min;
        const [maxX, maxY, maxZ] = data.boundingBox.max;
        box = { minX, minY, minZ, maxX, maxY, maxZ };
    }
    else {
        const v = data.vertices;
        if (!v || v.length < 3)
            return null;
        box = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
        for (let i = 0; i < v.length; i += 3) {
            if (v[i] < box.minX)
                box.minX = v[i];
            if (v[i + 1] < box.minY)
                box.minY = v[i + 1];
            if (v[i + 2] < box.minZ)
                box.minZ = v[i + 2];
            if (v[i] > box.maxX)
                box.maxX = v[i];
            if (v[i + 1] > box.maxY)
                box.maxY = v[i + 1];
            if (v[i + 2] > box.maxZ)
                box.maxZ = v[i + 2];
        }
    }
    geometryBoxCache.set(data, box);
    return box;
}
/**
 * Union of a model's non-skinned part boxes in model space (part node
 * transforms applied). Skinned parts are left out: their vertices are in
 * bind space, not model space (see skeletonBox()).
 */
function partsBox(parts) {
    let box = partsBoxCache.get(parts);
    if (box)
        return box;
    box = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
    for (const part of parts) {
        if (part.skinned)
            continue;
        const b = geometryBox(part.geometryData);
        if (!b)
            continue;
        const m = part.matrix;
        for (let c = 0; c < 8; c++) {
            const x = c & 1 ? b.maxX : b.minX, y = c & 2 ? b.maxY : b.minY, z = c & 4 ? b.maxZ : b.minZ;
            const wx = m ? m[0] * x + m[4] * y + m[8] * z + m[12] : x;
            const wy = m ? m[1] * x + m[5] * y + m[9] * z + m[13] : y;
            const wz = m ? m[2] * x + m[6] * y + m[10] * z + m[14] : z;
            if (wx < box.minX)
                box.minX = wx;
            if (wy < box.minY)
                box.minY = wy;
            if (wz < box.minZ)
                box.minZ = wz;
            if (wx > box.maxX)
                box.maxX = wx;
            if (wy > box.maxY)
                box.maxY = wy;
            if (wz > box.maxZ)
                box.maxZ = wz;
        }
    }
    if (box.minX > box.maxX)
        box = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
    partsBoxCache.set(parts, box);
    return box;
}
/**
 * Model-space box around a skeleton's joints in their current pose,
 * padded by a tenth of its size to cover the body around the bones.
 */
function skeletonBox(worldMatrices, boneCount) {
    if (!boneCount)
        return null;
    const box = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
    for (let b = 0; b < boneCount; b++) {
        const x = worldMatrices[b * 16 + 12], y = worldMatrices[b * 16 + 13], z = worldMatrices[b * 16 + 14];
        if (x < box.minX)
            box.minX = x;
        if (y < box.minY)
            box.minY = y;
        if (z < box.minZ)
            box.minZ = z;
        if (x > box.maxX)
            box.maxX = x;
        if (y > box.maxY)
            box.maxY = y;
        if (z > box.maxZ)
            box.maxZ = z;
    }
    const pad = Math.max(box.maxX - box.minX, box.maxY - box.minY, box.maxZ - box.minZ) * 0.1;
    box.minX -= pad;
    box.minY -= pad;
    box.minZ -= pad;
    box.maxX += pad;
    box.maxY += pad;
    box.maxZ += pad;
    return box;
}
/** Floats per debug line vertex: x, y, z, r, g, b, a. */
const DEBUG_LINE_FLOATS = 7;
/** Bounding sphere colours by level of detail (debugDraw({ bounds: true })). */
const DEBUG_LOD_COLORS = [
    [0.25, 1, 0.3], // full detail
    [1, 0.85, 0.1],
    [1, 0.5, 0.1],
    [1, 0.15, 0.15]
];
const DEBUG_NO_LOD_COLOR = [0.4, 0.65, 1];
const hexColorCache = new Map();
/**
 * Parse a "#rrggbb" colour into 0..1 components (cached).
 */
function parseHexColor(color) {
    let rgb = hexColorCache.get(color);
    if (!rgb) {
        const hex = color.replace("#", "");
        rgb = [
            parseInt(hex.substring(0, 2), 16) / 255,
            parseInt(hex.substring(2, 4), 16) / 255,
            parseInt(hex.substring(4, 6), 16) / 255
        ];
        hexColorCache.set(color, rgb);
    }
    return rgb;
}
/**
 * out = a * b for column-major 4x4 matrices (out must not alias a or b).
 */
function multiplyMat4Into(out, a, b) {
    for (let col = 0; col < 4; col++) {
        const b0 = b[col * 4], b1 = b[col * 4 + 1], b2 = b[col * 4 + 2], b3 = b[col * 4 + 3];
        out[col * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
        out[col * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
        out[col * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
        out[col * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
}
function sortItemsFrontToBack(a, b) {
    return a.sortKey - b.sortKey;
}
function sortBatchesFrontToBack(a, b) {
    return a.items[0].sortKey - b.items[0].sortKey;
}
function sortItemsBackToFront(a, b) {
    return b.sortKey - a.sortKey;
}
function sortSpritesBackToFront(a, b) {
    return b._webglSortKey - a._webglSortKey;
}
/**
 * Custom WebGL renderer for IGE supporting full 3D rendering.
 * This renderer replaces the experimental three.js integration with
 * a purpose-built WebGL system for maximum control and performance.
 */
export class IgeWebGlRenderer extends IgeBaseRenderer {
    classId = "IgeWebGlRenderer";
    _canvasContext;
    _webglVersion = 2;
    _contextLost = false;
    // Background clear colour (defaults to opaque black to preserve prior behaviour).
    _clearColor = { r: 0, g: 0, b: 0, a: 1 };
    // WebGL capabilities and extensions
    _capabilities = {
        maxTextureSize: 0,
        maxVertexAttribs: 0,
        maxVaryingVectors: 0,
        maxVertexTextureImageUnits: 0,
        maxTextureImageUnits: 0,
        maxCombinedTextureImageUnits: 0,
        maxVertexUniformVectors: 0,
        maxFragmentUniformVectors: 0,
        supportsInstancedArrays: false,
        supportsVertexArrayObjects: false,
        supportsDepthTexture: false,
        supportsFloatTextures: false
    };
    // Manager instances
    _resourceManager;
    _shaderManager;
    _textureManager;
    _geometryManager;
    _cameraController;
    _stateManager;
    _lightManager;
    _shadowManager;
    _skeletonManager;
    // Shadow-casting directional light reference
    _shadowCastingLight;
    _shadowLightId = "mainDirectionalLight";
    // Shadow debug mode (0 = off, 1-4 = different visualizations)
    _shadowDebugMode = 0;
    // Point lights that cast shadows
    _shadowCastingPointLights = [];
    // Frame-level render state (reused every frame to avoid allocations)
    _frameId = 0;
    _itemPool = [];
    _itemCount = 0;
    _sceneData = new WeakMap();
    _skeletonRows = new Map();
    _mainBatcher = new IgeWebGlItemBatcher();
    _depthBatcher = new IgeWebGlItemBatcher();
    _transparentItems = [];
    _opaqueSprites = [];
    _transparentSprites = [];
    _maxPixelRatio = Infinity;
    _shadowShareThreshold = 0.35;
    _sharedShadowFrame = -1;
    _pendingBlobTextures = new Set();
    _particleBuffers = new Map();
    _decalMeshBuffers = new Map();
    _defaultParticleTexture = null;
    _defaultDecalTexture = null;
    _lightFrustum = new IgeFrustum();
    // Point light shadow casters in range of the current light, with the
    // LOD key and geometry chosen for it (reused across lights and frames)
    _pointCasterItems = [];
    _pointCasterKeys = [];
    _pointCasterGeometries = [];
    _lightFrustumMatrix = new IgeMatrix4();
    // GPU instancing (WebGL 2 only)
    _instancingEnabled = true;
    _minInstanceCount = 2;
    _instanceBuffer;
    _bonePalette;
    _fog = {
        mode: "none",
        color: { r: 0, g: 0, b: 0 },
        near: 500,
        far: 2000,
        density: 0.001
    };
    _stats = {
        drawCalls: 0,
        instancedDrawCalls: 0,
        instances: 0,
        shadowDrawCalls: 0,
        items: 0,
        visibleItems: 0,
        lodItems: 0,
        triangles: 0,
        shadowCacheRebuilds: 0,
        viewports: 0
    };
    // Multiplies every on-screen size used to pick a level of detail
    _lodBias = 1;
    // Cull back faces of opaque meshes (off by default, see backFaceCulling())
    _backFaceCulling = false;
    // Cached static shadow casters (off by default, see shadowCaching())
    _shadowCaching = false;
    _staticDepthBatcher = new IgeWebGlItemBatcher();
    _shadowMapHoldsCache = false;
    _directionalPassesThisFrame = 0;
    _directionalPassesLastFrame = 0;
    // When true, the WebGL drawing buffer is preserved after compositing,
    // allowing gl.readPixels() to work after a frame is rendered.
    // Must be set before createFrontBuffer() is called.
    _preserveDrawingBuffer = false;
    // Context version to ask for first (see preferredWebGlVersion())
    _preferredWebGlVersion = 2;
    // Debug drawing (see debugDraw() and debugLine())
    _debugOptions = { bounds: false, shadowFrustum: false };
    _debugLineData = new Float32Array(DEBUG_LINE_FLOATS * 2048);
    _debugLineVertices = 0;
    _debugLineBuffer = null;
    /**
     * Initialize the WebGL renderer.
     */
    async _setup() {
        await super._setup();
        if (isServer) {
            this.log("WebGL renderer cannot run on server-side", "warning");
            return;
        }
        this.createFrontBuffer();
        if (!this._canvasElement || !this._canvasContext) {
            throw new Error("Failed to create WebGL context");
        }
        // Query and store WebGL capabilities
        this._queryCapabilities();
        // Initialize manager classes
        this._resourceManager = new IgeWebGlResourceManager(this._canvasContext, this._webglVersion);
        this._shaderManager = new IgeWebGlShaderManager(this._canvasContext, this._resourceManager);
        this._textureManager = new IgeWebGlTextureManager(this._canvasContext, this._resourceManager);
        this._geometryManager = new IgeWebGlGeometryManager(this._canvasContext, this._resourceManager);
        this._cameraController = new IgeWebGlCameraController();
        this._stateManager = new IgeWebGlStateManager(this._canvasContext);
        this._lightManager = new IgeWebGlLightManager();
        this._shadowManager = new IgeWebGlShadowManager(this._canvasContext, this._resourceManager, this._webglVersion);
        this._skeletonManager = new IgeWebGlSkeletonManager();
        // Instanced rendering needs WebGL 2 (instanced arrays + float textures)
        if (this._webglVersion === 2) {
            const gl2 = this._canvasContext;
            this._instanceBuffer = new IgeWebGlInstanceBuffer(gl2);
            this._bonePalette = new IgeWebGlBonePalette(gl2);
        }
        // Compile built-in shaders
        this._compileBuiltInShaders();
        this.isReady(true);
        this.log("WebGL renderer initialized successfully");
    }
    /**
     * Creates a WebGL canvas front buffer.
     */
    createFrontBuffer(autoSize = true, dontScale = false) {
        if (!isClient) {
            return;
        }
        if (this._canvasElement) {
            return;
        }
        this._createdFrontBuffer = true;
        this._pixelRatioScaling = !dontScale;
        // Create a new canvas element
        const tempCanvas = document.createElement("canvas");
        tempCanvas.id = "igeFrontBuffer";
        this.canvasElement(tempCanvas, autoSize);
        document.body.appendChild(tempCanvas);
    }
    /**
     * Gets / sets the canvas element and creates WebGL context.
     */
    canvasElement(elem, autoSize = true) {
        if (isServer)
            return;
        if (elem === undefined) {
            return this._canvasElement;
        }
        this._canvasElement = elem;
        // Try to get WebGL2 context first, fallback to WebGL1
        let gl = null;
        // WebGL2 attributes
        const contextAttributes = {
            alpha: true,
            antialias: true,
            depth: true,
            stencil: false,
            preserveDrawingBuffer: this._preserveDrawingBuffer,
            premultipliedAlpha: true,
            powerPreference: "high-performance"
        };
        // Try WebGL2 first (unless WebGL 1 was asked for, e.g. for testing)
        gl = this._preferredWebGlVersion === 2
            ? this._canvasElement.getContext("webgl2", contextAttributes)
            : null;
        if (gl) {
            this._webglVersion = 2;
            this.log("Using WebGL 2.0");
        }
        else {
            // Fallback to WebGL1
            gl = this._canvasElement.getContext("webgl", contextAttributes);
            if (!gl) {
                // Try experimental WebGL
                gl = this._canvasElement.getContext("experimental-webgl", contextAttributes);
            }
            if (gl) {
                this._webglVersion = 1;
                this.log("Using WebGL 1.0");
            }
            else {
                throw new Error("WebGL is not supported in this browser!");
            }
        }
        this._canvasContext = gl;
        // Set up device pixel ratio
        if (this._pixelRatioScaling) {
            this._devicePixelRatio = Math.min(window.devicePixelRatio || 1, this._maxPixelRatio);
        }
        else {
            this._devicePixelRatio = 1;
        }
        this.log(`Device pixel ratio is ${this._devicePixelRatio}`);
        this._autoSize = autoSize;
        // Set up context loss/restore handling
        this._canvasElement.addEventListener("webglcontextlost", this._handleContextLost, false);
        this._canvasElement.addEventListener("webglcontextrestored", this._handleContextRestored, false);
        // Initial resize
        this._resizeEvent();
        // Set up input listeners
        ige.input.setupListeners(this._canvasElement);
        ige.engine.headless(false);
        return this._canvasElement;
    }
    /**
     * Compile built-in shaders from the shader library.
     */
    _compileBuiltInShaders() {
        if (!this._shaderManager) {
            throw new Error("Shader manager not initialized");
        }
        // Get all built-in shaders
        const shaderIds = IgeShaderLibrary.getAll();
        for (const shaderId of shaderIds) {
            const shaderSource = IgeShaderLibrary.get(shaderId);
            if (shaderSource) {
                const program = this._shaderManager.createProgram(shaderId, shaderSource.vertex, shaderSource.fragment);
                if (program) {
                    this.log(`Compiled shader program: ${shaderId}`);
                }
                else {
                    this.log(`Failed to compile shader program: ${shaderId}`, "error");
                }
            }
        }
    }
    /**
     * Query WebGL capabilities and store them.
     */
    _queryCapabilities() {
        const gl = this._canvasContext;
        if (!gl)
            return;
        this._capabilities.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        this._capabilities.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        this._capabilities.maxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS);
        this._capabilities.maxVertexTextureImageUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
        this._capabilities.maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        this._capabilities.maxCombinedTextureImageUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
        this._capabilities.maxVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
        this._capabilities.maxFragmentUniformVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
        // Check for instanced arrays support
        if (this._webglVersion === 2) {
            this._capabilities.supportsInstancedArrays = true;
            this._capabilities.supportsVertexArrayObjects = true;
        }
        else {
            const instancedExt = gl.getExtension("ANGLE_instanced_arrays");
            this._capabilities.supportsInstancedArrays = !!instancedExt;
            const vaoExt = gl.getExtension("OES_vertex_array_object");
            this._capabilities.supportsVertexArrayObjects = !!vaoExt;
        }
        // 32-bit indices (meshes over 65535 vertices) are core in WebGL 2
        // but an extension in WebGL 1 that must be switched on before use
        if (this._webglVersion === 1 && !gl.getExtension("OES_element_index_uint")) {
            this.log("OES_element_index_uint is unavailable: meshes with more than 65535 vertices can't be drawn", "warning");
        }
        // Check for depth texture support
        if (this._webglVersion === 2) {
            this._capabilities.supportsDepthTexture = true;
        }
        else {
            const depthTextureExt = gl.getExtension("WEBGL_depth_texture");
            this._capabilities.supportsDepthTexture = !!depthTextureExt;
        }
        // Check for float texture support
        const floatTextureExt = gl.getExtension("OES_texture_float");
        this._capabilities.supportsFloatTextures = !!floatTextureExt;
        this.log(`WebGL Capabilities:`);
        this.log(`  Max Texture Size: ${this._capabilities.maxTextureSize}`);
        this.log(`  Max Vertex Attribs: ${this._capabilities.maxVertexAttribs}`);
        this.log(`  Supports Instanced Arrays: ${this._capabilities.supportsInstancedArrays}`);
        this.log(`  Supports VAO: ${this._capabilities.supportsVertexArrayObjects}`);
        this.log(`  Supports Depth Texture: ${this._capabilities.supportsDepthTexture}`);
    }
    /**
     * Handle canvas resize events.
     */
    _resizeEvent = (event) => {
        if (!this._canvasElement || !this._autoSize)
            return;
        markSceneChanged();
        // Get the window dimensions
        let newWidth = window.innerWidth;
        let newHeight = window.innerHeight;
        // Update bounds
        this._bounds2d = new IgePoint2d(newWidth, newHeight);
        // Set canvas display size (CSS pixels)
        this._canvasElement.style.width = newWidth + "px";
        this._canvasElement.style.height = newHeight + "px";
        // Set actual canvas size (device pixels)
        this._canvasElement.width = Math.floor(newWidth * this._devicePixelRatio);
        this._canvasElement.height = Math.floor(newHeight * this._devicePixelRatio);
        this._resized = true;
        this.log(`Canvas resized to ${this._canvasElement.width}x${this._canvasElement.height} (device pixels)`);
    };
    /**
     * Handle WebGL context loss.
     */
    _handleContextLost = (event) => {
        event.preventDefault();
        this._contextLost = true;
        this.log("WebGL context lost!", "warning");
    };
    /**
     * Handle WebGL context restoration.
     */
    _handleContextRestored = () => {
        this._contextLost = false;
        this.log("WebGL context restored, reinitializing resources...");
        // Recreate all GPU resources
        // this._recreateResources();
    };
    /**
     * Set the background clear colour used for the canvas and each viewport.
     * Components are 0..1. Defaults to opaque black.
     *
     * Each viewport's area is cleared to this colour (including alpha) before
     * it is drawn, so split-screen viewports all share the same background.
     */
    setClearColor(r, g, b, a = 1) {
        this._clearColor = { r, g, b, a };
        return this;
    }
    fog(settings) {
        if (settings === undefined) {
            return { ...this._fog, color: { ...this._fog.color } };
        }
        this._fog = {
            ...this._fog,
            ...settings,
            color: { ...this._fog.color, ...(settings.color || {}) }
        };
        return this;
    }
    instancing(val) {
        if (val === undefined) {
            return this._instancingEnabled && !!this._instanceBuffer;
        }
        this._instancingEnabled = val;
        return this;
    }
    /**
     * Free the GPU buffers of a geometry, e.g. a terrain chunk that was
     * rebuilt or a level that was unloaded, along with any LOD meshes
     * generated from it. Pass the geometry data or its id. If an entity
     * still draws the geometry it is simply uploaded again on its next
     * frame, so releasing too early costs time but doesn't break anything.
     */
    releaseGeometry(geometry) {
        if (!this._geometryManager)
            return this;
        if (typeof geometry === "string") {
            this._geometryManager.deleteGeometry(geometry);
            return this;
        }
        this._geometryManager.deleteGeometry(geometry.id);
        for (const lod of takeGeneratedLods(geometry)) {
            this._geometryManager.deleteGeometry(lod.id);
        }
        return this;
    }
    /**
     * Free the GPU copy of a texture (an IgeTexture, or the id of a model
     * texture). IgeTexture.destroy() does this automatically. A texture
     * that is still used is uploaded again when next drawn.
     */
    releaseTexture(texture) {
        const id = typeof texture === "string" ? texture : texture.id();
        if (!id || !this._textureManager)
            return this;
        this._textureManager.deleteTexture(id);
        this._pendingBlobTextures.delete(id);
        return this;
    }
    shadowCaching(val) {
        if (val === undefined) {
            return this._shadowCaching;
        }
        this._shadowCaching = val;
        this._shadowMapHoldsCache = false;
        return this;
    }
    /**
     * Where the directional shadow frustum should be centred for a view
     * target: the target itself, or with shadow caching on, the target
     * snapped to a coarse grid so small camera moves don't move the frustum.
     */
    _shadowCenter(x, y, z) {
        if (!this._shadowCaching || !this._shadowManager)
            return { x, y, z };
        const step = Math.max(this._shadowManager.frustumSize() * SHADOW_RECENTER_STEP, 1e-6);
        return {
            x: Math.round(x / step) * step,
            y: Math.round(y / step) * step,
            z: Math.round(z / step) * step
        };
    }
    debugDraw(options) {
        if (options === undefined) {
            return { ...this._debugOptions };
        }
        this._debugOptions = { ...this._debugOptions, ...options };
        return this;
    }
    /**
     * Draw a world-space line in every viewport on the next rendered frame,
     * e.g. an AI path, an attack range or a ray. Call it each frame the line
     * should stay visible.
     * @param color RGBA, 0-1 (default yellow).
     */
    debugLine(x1, y1, z1, x2, y2, z2, color = { r: 1, g: 0.9, b: 0.2, a: 1 }) {
        this._pushDebugLine(x1, y1, z1, x2, y2, z2, color.r, color.g, color.b, color.a ?? 1);
        return this;
    }
    _pushDebugLine(x1, y1, z1, x2, y2, z2, r, g, b, a) {
        const needed = (this._debugLineVertices + 2) * DEBUG_LINE_FLOATS;
        if (needed > this._debugLineData.length) {
            const grown = new Float32Array(Math.max(needed, this._debugLineData.length * 2));
            grown.set(this._debugLineData);
            this._debugLineData = grown;
        }
        const d = this._debugLineData;
        let o = this._debugLineVertices * DEBUG_LINE_FLOATS;
        d[o++] = x1;
        d[o++] = y1;
        d[o++] = z1;
        d[o++] = r;
        d[o++] = g;
        d[o++] = b;
        d[o++] = a;
        d[o++] = x2;
        d[o++] = y2;
        d[o++] = z2;
        d[o++] = r;
        d[o++] = g;
        d[o++] = b;
        d[o++] = a;
        this._debugLineVertices += 2;
    }
    /** Three great circles approximating a sphere. */
    _pushDebugSphere(cx, cy, cz, radius, color) {
        const segments = 16;
        const [r, g, b] = color;
        for (let k = 0; k < segments; k++) {
            const a0 = (k / segments) * Math.PI * 2, a1 = ((k + 1) / segments) * Math.PI * 2;
            const c0 = Math.cos(a0) * radius, s0 = Math.sin(a0) * radius;
            const c1 = Math.cos(a1) * radius, s1 = Math.sin(a1) * radius;
            this._pushDebugLine(cx + c0, cy + s0, cz, cx + c1, cy + s1, cz, r, g, b, 1);
            this._pushDebugLine(cx + c0, cy, cz + s0, cx + c1, cy, cz + s1, r, g, b, 1);
            this._pushDebugLine(cx, cy + c0, cz + s0, cx, cy + c1, cz + s1, r, g, b, 1);
        }
    }
    /**
     * Draw this viewport's debug lines: lines queued with debugLine() plus,
     * when enabled, bounds and the shadow frustum (generated per viewport
     * and dropped again afterwards).
     */
    _renderDebugLines(matrices) {
        const debug = this._debugOptions;
        const queued = this._debugLineVertices;
        if (queued === 0 && !debug.bounds && !debug.shadowFrustum)
            return;
        const gl = this._canvasContext;
        const program = this._shaderManager?.getProgram("debug_line");
        if (!gl || !program || !this._stateManager)
            return;
        if (debug.bounds) {
            const pushItem = (item) => {
                if (item.radius < 0)
                    return;
                const color = item.lodSizes ? DEBUG_LOD_COLORS[Math.min(item.lodLevel, DEBUG_LOD_COLORS.length - 1)] : DEBUG_NO_LOD_COLOR;
                this._pushDebugSphere(item.cx, item.cy, item.cz, item.radius, color);
            };
            for (const batch of this._mainBatcher.batches) {
                for (let i = 0; i < batch.items.length; i++)
                    pushItem(batch.items[i]);
            }
            for (let i = 0; i < this._transparentItems.length; i++)
                pushItem(this._transparentItems[i]);
        }
        if (debug.shadowFrustum && this._shadowManager && this.shadowsEnabled()) {
            const lightSpace = this._shadowManager.getLightSpaceMatrix(this._shadowLightId);
            if (lightSpace) {
                this._lightFrustumMatrix.matrix.set(lightSpace);
                const inverse = this._lightFrustumMatrix.getInverse();
                if (inverse) {
                    const m = inverse.matrix;
                    const corners = [];
                    for (let i = 0; i < 8; i++) {
                        const x = i & 1 ? 1 : -1, y = i & 2 ? 1 : -1, z = i & 4 ? 1 : -1;
                        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
                        corners.push([
                            (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
                            (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
                            (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
                        ]);
                    }
                    const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
                    for (const [a, b] of edges) {
                        const p = corners[a], q = corners[b];
                        this._pushDebugLine(p[0], p[1], p[2], q[0], q[1], q[2], 1, 0.4, 1, 1);
                    }
                }
            }
        }
        const vertices = this._debugLineVertices;
        if (vertices > 0) {
            if (!this._debugLineBuffer)
                this._debugLineBuffer = gl.createBuffer();
            const stride = DEBUG_LINE_FLOATS * 4;
            const position = program.getAttributeLocation("a_position");
            const color = program.getAttributeLocation("a_color");
            program.use();
            program.setUniformMatrix4fv("u_viewMatrix", matrices.view);
            program.setUniformMatrix4fv("u_projectionMatrix", matrices.projection);
            // Raw buffer binding: tell the state manager its cache is stale
            this._stateManager.reset();
            gl.bindBuffer(gl.ARRAY_BUFFER, this._debugLineBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this._debugLineData.subarray(0, vertices * DEBUG_LINE_FLOATS), gl.STREAM_DRAW);
            gl.enableVertexAttribArray(position);
            gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride, 0);
            gl.enableVertexAttribArray(color);
            gl.vertexAttribPointer(color, 4, gl.FLOAT, false, stride, 12);
            this._stateManager.setDepthTest(true);
            this._stateManager.setDepthWrite(false);
            this._stateManager.setBlend(true);
            this._stateManager.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArrays(gl.LINES, 0, vertices);
            gl.disableVertexAttribArray(position);
            gl.disableVertexAttribArray(color);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            this._stateManager.reset();
            this._stateManager.setDepthWrite(true);
        }
        // Keep only the queued lines for the next viewport
        this._debugLineVertices = queued;
    }
    backFaceCulling(val) {
        if (val === undefined) {
            return this._backFaceCulling;
        }
        this._backFaceCulling = val;
        return this;
    }
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
    screenToHeightfield(viewport, screenX, screenY, heightAt, options) {
        const ray = this.screenToWorldRay(viewport, screenX, screenY);
        return ray ? intersectHeightfield(ray, heightAt, options) : null;
    }
    lodBias(val) {
        if (val === undefined) {
            return this._lodBias;
        }
        this._lodBias = Math.max(0, val);
        return this;
    }
    maxPixelRatio(val) {
        if (val === undefined) {
            return this._maxPixelRatio;
        }
        this._maxPixelRatio = Math.max(0.25, val);
        if (this._pixelRatioScaling && typeof window !== "undefined") {
            this._devicePixelRatio = Math.min(window.devicePixelRatio || 1, this._maxPixelRatio);
            this._resizeEvent();
        }
        return this;
    }
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
    worldToScreen(viewport, x, y, z) {
        if (!this._cameraController || !viewport.camera)
            return null;
        const m = this._cameraController.updateCamera(viewport.camera, viewport).viewProjection.matrix;
        const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
        const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
        const cz = m[2] * x + m[6] * y + m[10] * z + m[14];
        const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
        if (cw <= 0) {
            return { x: 0, y: 0, depth: 0, visible: false };
        }
        const nx = cx / cw, ny = cy / cw, nz = cz / cw;
        const vx = viewport._translate?.x || 0;
        const vyBottom = viewport._translate?.y || 0;
        const vw = viewport._bounds2d.x;
        const vh = viewport._bounds2d.y;
        // Viewport y is measured from the canvas bottom (WebGL convention)
        const screenX = vx + (nx * 0.5 + 0.5) * vw;
        const screenY = this._bounds2d.y - (vyBottom + (ny * 0.5 + 0.5) * vh);
        return {
            x: screenX,
            y: screenY,
            depth: nz,
            visible: nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1 && nz >= -1 && nz <= 1
        };
    }
    /**
     * The view, projection and combined matrices (and frustum) a viewport's
     * camera renders with, for projecting many points without repeating
     * the camera setup (see IgeViewportOverlay). Null without a camera.
     */
    cameraMatrices(viewport) {
        if (!this._cameraController || !viewport.camera)
            return null;
        return this._cameraController.updateCamera(viewport.camera, viewport);
    }
    /**
     * Build a world-space ray through a screen point (CSS pixels from the
     * canvas's top-left) in a viewport, for mouse picking and aiming.
     * Returns null if the viewport has no camera.
     */
    screenToWorldRay(viewport, screenX, screenY) {
        if (!this._cameraController || !viewport.camera)
            return null;
        const inverse = this._cameraController.updateCamera(viewport.camera, viewport).viewProjection.getInverse();
        if (!inverse)
            return null;
        const vx = viewport._translate?.x || 0;
        const vyBottom = viewport._translate?.y || 0;
        const vw = viewport._bounds2d.x;
        const vh = viewport._bounds2d.y;
        const nx = ((screenX - vx) / vw) * 2 - 1;
        const ny = ((this._bounds2d.y - screenY - vyBottom) / vh) * 2 - 1;
        const unproject = (nz) => {
            const m = inverse.matrix;
            const x = m[0] * nx + m[4] * ny + m[8] * nz + m[12];
            const y = m[1] * nx + m[5] * ny + m[9] * nz + m[13];
            const z = m[2] * nx + m[6] * ny + m[10] * nz + m[14];
            const w = m[3] * nx + m[7] * ny + m[11] * nz + m[15];
            return { x: x / w, y: y / w, z: z / w };
        };
        const near = unproject(-1);
        const far = unproject(1);
        let dx = far.x - near.x, dy = far.y - near.y, dz = far.z - near.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dx /= len;
        dy /= len;
        dz /= len;
        return { origin: near, direction: { x: dx, y: dy, z: dz } };
    }
    /**
     * Where a screen point (CSS pixels from the canvas's top-left) hits the
     * horizontal plane y = groundY in a viewport, e.g. for click-to-move or
     * mouse aiming. Returns null if the ray doesn't hit the plane.
     */
    screenToGround(viewport, screenX, screenY, groundY = 0) {
        const ray = this.screenToWorldRay(viewport, screenX, screenY);
        if (!ray || Math.abs(ray.direction.y) < 1e-6)
            return null;
        const t = (groundY - ray.origin.y) / ray.direction.y;
        if (t < 0)
            return null;
        return {
            x: ray.origin.x + ray.direction.x * t,
            y: groundY,
            z: ray.origin.z + ray.direction.z * t
        };
    }
    /**
     * The viewport under a screen point (CSS pixels from the canvas's
     * top-left), e.g. to route mouse input in split screen. The topmost
     * (last mounted) viewport wins when viewports overlap.
     */
    viewportAt(screenX, screenY) {
        const viewports = ige.engine._children;
        for (let i = viewports.length - 1; i >= 0; i--) {
            const viewport = viewports[i];
            if (!viewport || !viewport._bounds2d || !viewport.camera)
                continue;
            const vx = viewport._translate?.x || 0;
            const vyBottom = viewport._translate?.y || 0;
            const top = this._bounds2d.y - vyBottom - viewport._bounds2d.y;
            if (screenX >= vx && screenX < vx + viewport._bounds2d.x &&
                screenY >= top && screenY < top + viewport._bounds2d.y) {
                return viewport;
            }
        }
        return undefined;
    }
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
    raycast(viewport, screenX, screenY, targets, options) {
        const ray = this.screenToWorldRay(viewport, screenX, screenY);
        const scene = targets ?? viewport._scene;
        if (!ray || !scene)
            return null;
        return raycastEntities(ray, scene, options)[0] ?? null;
    }
    pointerPicking(mode) {
        if (mode === undefined) {
            return this._pointerPicking;
        }
        this._pointerPicking = mode;
        return this;
    }
    _pointerPicking = "box";
    /**
     * Whether a screen point (CSS pixels from the canvas's top-left) is over
     * an entity in the viewport under it. IGE's pointer events (pointerOver,
     * pointerDown, pointerUp...) use this when the WebGL renderer is active.
     * Meshes are hit by their bounding box, or by their triangles with
     * pointerPicking("triangles"); sprites exactly by their quad in flat
     * views (screen2d, or billboard("none")), or by their on-screen
     * rectangle when billboarded.
     */
    pointerHitTest(entity, screenX, screenY) {
        const viewport = this.viewportAt(screenX, screenY);
        const world = entity._worldMatrix4;
        if (!viewport || !world || entity._hidden)
            return false;
        const ray = this.screenToWorldRay(viewport, screenX, screenY);
        if (!ray)
            return false;
        const camera = viewport.camera;
        const isSprite = !entity._modelParts && !entity._geometryData?.vertices && !!entity._texture;
        const flat2d = !!(camera._up && camera._up.y < 0);
        if (isSprite && !flat2d && entity._billboardMode !== 0) {
            // Billboard: compare against its rectangle on screen
            const matrices = this.cameraMatrices(viewport);
            if (!matrices)
                return false;
            const m = world.matrix;
            const centre = this.worldToScreen(viewport, m[12], m[13], m[14]);
            if (!centre || !centre.visible)
                return false;
            // Screen pixels per world unit at the entity's distance
            const p = matrices.projection.matrix;
            let pixelsPerUnit = p[5] * viewport._bounds2d.y * 0.5;
            if (p[11] !== 0) {
                const v = matrices.view.matrix;
                const depth = -(v[2] * m[12] + v[6] * m[13] + v[10] * m[14] + v[14]);
                pixelsPerUnit /= Math.max(depth, 1e-3);
            }
            const halfW = entity._bounds2d.x * Math.hypot(m[0], m[1], m[2]) * pixelsPerUnit * 0.5;
            const halfH = entity._bounds2d.y * Math.hypot(m[4], m[5], m[6]) * pixelsPerUnit * 0.5;
            return Math.abs(screenX - centre.x) <= halfW && Math.abs(screenY - centre.y) <= halfH;
        }
        // Bring the ray into the entity's local space
        const inverse = world.getInverse();
        if (!inverse)
            return false;
        const n = inverse.matrix;
        const o = ray.origin, d = ray.direction;
        const ox = n[0] * o.x + n[4] * o.y + n[8] * o.z + n[12];
        const oy = n[1] * o.x + n[5] * o.y + n[9] * o.z + n[13];
        const oz = n[2] * o.x + n[6] * o.y + n[10] * o.z + n[14];
        const dx = n[0] * d.x + n[4] * d.y + n[8] * d.z;
        const dy = n[1] * d.x + n[5] * d.y + n[9] * d.z;
        const dz = n[2] * d.x + n[6] * d.y + n[10] * d.z;
        if (isSprite) {
            // Flat sprite: the quad lies on the local z = 0 plane
            if (Math.abs(dz) < 1e-9)
                return false;
            const t = -oz / dz;
            if (t < 0)
                return false;
            const x = ox + dx * t, y = oy + dy * t;
            return Math.abs(x) <= entity._bounds2d.x / 2 && Math.abs(y) <= entity._bounds2d.y / 2;
        }
        let box = null;
        if (entity._modelParts) {
            box = partsBox(entity._modelParts);
            // Skinned meshes: the box around the animated joints
            const skeleton = entity._skeleton;
            if (skeleton && entity._modelParts.some((part) => part.skinned)) {
                entity._updateSkeletonMatrices();
                const bones = skeletonBox(skeleton.worldMatrices, skeleton.data.boneCount);
                if (bones) {
                    const staticBox = box;
                    box = { ...bones };
                    if (staticBox && staticBox.maxX > staticBox.minX) {
                        box.minX = Math.min(box.minX, staticBox.minX);
                        box.minY = Math.min(box.minY, staticBox.minY);
                        box.minZ = Math.min(box.minZ, staticBox.minZ);
                        box.maxX = Math.max(box.maxX, staticBox.maxX);
                        box.maxY = Math.max(box.maxY, staticBox.maxY);
                        box.maxZ = Math.max(box.maxZ, staticBox.maxZ);
                    }
                }
            }
        }
        else if (entity._geometryData) {
            box = geometryBox(entity._geometryData);
        }
        if (!box)
            return false;
        // Ray against the box (slab method)
        let tMin = 0, tMax = Infinity;
        const slabs = [
            [ox, dx, box.minX, box.maxX],
            [oy, dy, box.minY, box.maxY],
            [oz, dz, box.minZ, box.maxZ]
        ];
        for (const [origin, direction, min, max] of slabs) {
            if (Math.abs(direction) < 1e-12) {
                if (origin < min || origin > max)
                    return false;
                continue;
            }
            let t1 = (min - origin) / direction, t2 = (max - origin) / direction;
            if (t1 > t2)
                [t1, t2] = [t2, t1];
            tMin = Math.max(tMin, t1);
            tMax = Math.min(tMax, t2);
            if (tMin > tMax)
                return false;
        }
        if (this._pointerPicking === "triangles") {
            return raycastEntities(ray, entity, { children: false }).length > 0;
        }
        return true;
    }
    shadowSharing(threshold) {
        if (threshold === undefined) {
            return this._shadowShareThreshold;
        }
        this._shadowShareThreshold = Math.max(0, threshold);
        return this;
    }
    /**
     * If all viewports share a scene and their camera targets are close
     * together, render one directional shadow map covering them all.
     * Returns true when the shared map was rendered for this frame.
     */
    _renderSharedShadowMap(viewports) {
        if (this._shadowShareThreshold <= 0 ||
            viewports.length < 2 ||
            !this.shadowsEnabled() ||
            !this._shadowManager ||
            !this._shadowCastingLight) {
            return false;
        }
        const scene = viewports[0]._scene;
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < viewports.length; i++) {
            const viewport = viewports[i];
            if (viewport._scene !== scene || !viewport.camera)
                return false;
            const target = viewport.camera._lookAt;
            const x = target ? target.x : 0, y = target ? target.y : 0, z = target ? target.z : 0;
            if (x < minX)
                minX = x;
            if (y < minY)
                minY = y;
            if (z < minZ)
                minZ = z;
            if (x > maxX)
                maxX = x;
            if (y > maxY)
                maxY = y;
            if (z > maxZ)
                maxZ = z;
        }
        const data = scene && this._sceneData.get(scene);
        if (!data)
            return false;
        const size = this._shadowManager.frustumSize();
        const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
        const extent = Math.sqrt(dx * dx + dy * dy + dz * dz) / 2;
        if (extent > size * this._shadowShareThreshold) {
            return false;
        }
        // Enlarge the frustum just enough to cover every viewport's area
        this._shadowManager.frustumSize(size + extent);
        const lightSpaceMatrix = this._shadowManager.updateLightSpaceMatrix(this._shadowLightId, this._shadowCastingLight, undefined, this._shadowCenter((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2));
        this._shadowManager.frustumSize(size);
        if (!lightSpaceMatrix)
            return false;
        this._renderDirectionalShadowPass(data, lightSpaceMatrix);
        this._stateManager?.reset();
        this._canvasContext?.depthFunc(this._canvasContext.LEQUAL);
        this._sharedShadowFrame = this._frameId;
        return true;
    }
    /**
     * Id of the most recently rendered frame. Compare with an object's
     * _lastRenderedFrame to tell whether it was drawn last frame.
     */
    frameId() {
        return this._frameId;
    }
    /**
     * Per-frame rendering statistics for the most recent frame.
     */
    stats() {
        return { ...this._stats };
    }
    /**
     * Main scene graph rendering method.
     * Called once per frame by the engine.
     *
     * Work that does not depend on the camera (transforms, skeleton
     * matrices, the bone palette and point light shadow maps) is done once
     * per frame here; each viewport then only culls, renders its directional
     * shadow map and draws its view.
     */
    renderSceneGraph(engine, viewports) {
        const gl = this._canvasContext;
        if (!gl || this._contextLost || !this._stateManager)
            return false;
        this._frameId++;
        if (this._textureManager)
            this._textureManager.frameId = this._frameId;
        const stats = this._stats;
        stats.drawCalls = 0;
        stats.instancedDrawCalls = 0;
        stats.instances = 0;
        stats.shadowDrawCalls = 0;
        stats.items = 0;
        stats.visibleItems = 0;
        stats.lodItems = 0;
        stats.triangles = 0;
        stats.shadowCacheRebuilds = 0;
        this._directionalPassesLastFrame = this._directionalPassesThisFrame;
        this._directionalPassesThisFrame = 0;
        stats.viewports = viewports ? viewports.length : 0;
        // Clear the entire canvas
        const cc = this._clearColor;
        this._stateManager.reset();
        this._stateManager.setScissorTest(false);
        gl.viewport(0, 0, this._canvasElement.width, this._canvasElement.height);
        gl.clearColor(cc.r, cc.g, cc.b, cc.a);
        gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Enable depth testing for 3D rendering
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        if (!viewports || viewports.length === 0) {
            return true;
        }
        // Collect renderables once per scene (viewports usually share one)
        this._itemCount = 0;
        this._skeletonRows.clear();
        this._bonePalette?.begin();
        for (let i = 0; i < viewports.length; i++) {
            const scene = viewports[i]._scene;
            if (!scene)
                continue;
            let data = this._sceneData.get(scene);
            if (!data) {
                data = { frameId: -1, models: [], sprites: [], particles: [], decals: [] };
                this._sceneData.set(scene, data);
            }
            if (data.frameId !== this._frameId) {
                data.frameId = this._frameId;
                data.models.length = 0;
                data.sprites.length = 0;
                data.particles.length = 0;
                data.decals.length = 0;
                this._collectRenderables(scene, data);
                for (let p = 0; p < data.particles.length; p++) {
                    this._uploadInstanceData(data.particles[p], PARTICLE_FLOATS);
                }
                for (let d = 0; d < data.decals.length; d++) {
                    this._uploadInstanceData(data.decals[d], DECAL_INSTANCE_FLOATS);
                }
                stats.items += data.models.length + data.sprites.length;
            }
        }
        // Upload the bone palette once; every viewport and shadow pass reads it
        if (this._bonePalette && this._skeletonRows.size > 0) {
            this._bonePalette.upload(BONE_TEXTURE_UNIT);
            this._stateManager.invalidateTextureBindings();
        }
        // Point light shadow maps don't depend on the camera: render them once
        if (this._shadowCastingPointLights.length > 0 && this._shadowManager) {
            this._renderPointLightShadowPasses();
            this._stateManager.reset();
            gl.depthFunc(gl.LEQUAL);
        }
        // Close-together split-screen views can share one shadow map
        this._renderSharedShadowMap(viewports);
        for (let i = 0; i < viewports.length; i++) {
            this._renderViewport(viewports[i]);
        }
        // Lines queued with debugLine() last one rendered frame
        this._debugLineVertices = 0;
        return true;
    }
    /**
     * Walk a scene graph once, refreshing transforms and turning every
     * renderable entity into pooled render items with world-space bounds.
     */
    _collectRenderables(obj, data, isSceneRoot = true) {
        if (obj._hidden) {
            return;
        }
        // Ensure matrices are current. The scene root itself is skipped: the
        // engine's update pass has already positioned it, and viewports each
        // re-parent a shared scene to themselves, so updating it here would
        // flip its parent mid-frame and invalidate every child's cached
        // transform. updateTransform() is a cheap no-op for unchanged entities.
        if (!isSceneRoot && typeof obj.updateTransform === "function") {
            obj.updateTransform();
        }
        const entity = obj;
        const geometryData = entity._geometryData;
        const parts = entity._modelParts;
        if (obj._isParticleSystem3d) {
            data.particles.push(obj);
        }
        else if (obj._isDecalSystem3d) {
            data.decals.push(obj);
        }
        else if (parts && parts.length > 0) {
            this._addModelParts(entity, parts, data);
        }
        else if (geometryData && geometryData.vertices) {
            // Plain geometry LOD applies only to the geometry it was made for
            const lod = entity._modelLod;
            const useLod = !!lod && lod.source === geometryData;
            const item = this._addModelItem(entity, geometryData, entity._materialData, null, entity._worldMatrix4?.matrix, useLod ? lod.partGeometries[0] : null, useLod ? lod.screenSizes : null);
            if (item)
                data.models.push(item);
        }
        else if (entity._texture) {
            data.sprites.push(entity);
        }
        const children = obj._children;
        if (children) {
            for (let i = 0; i < children.length; i++) {
                this._collectRenderables(children[i], data, false);
            }
        }
    }
    /**
     * Add one render item per part of an entity's model. Parts with their
     * own node transform get a world matrix of entity world * part matrix,
     * kept in a per-entity buffer; the rest share the entity's matrix. The
     * entity's own _materialData (if any) overrides the parts' materials.
     */
    _addModelParts(entity, parts, data) {
        const world = entity._worldMatrix4?.matrix;
        if (!world)
            return;
        const modelLod = entity._modelLod;
        const lod = modelLod && !modelLod.source && modelLod.partGeometries.length === parts.length ? modelLod : undefined;
        let matrices = entity._modelPartMatrices;
        if (!matrices || matrices.length !== parts.length) {
            matrices = entity._modelPartMatrices = parts.map((part) => (part.matrix ? new Float32Array(16) : world));
        }
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            let partWorld = world;
            if (part.matrix) {
                partWorld = matrices[i];
                multiplyMat4Into(partWorld, world, part.matrix);
            }
            const item = this._addModelItem(entity, part.geometryData, part.materialData, entity._materialData, partWorld, lod ? lod.partGeometries[i] : null, lod ? lod.screenSizes : null);
            if (item)
                data.models.push(item);
        }
    }
    /**
     * Start uploading a model texture image (once); it is used as soon as
     * the upload completes.
     */
    _requestBlobTexture(textureId, blob) {
        if (!this._textureManager || this._pendingBlobTextures.has(textureId))
            return;
        this._pendingBlobTextures.add(textureId);
        this._textureManager.createTextureFromBlob(textureId, blob).then((texture) => {
            if (!texture) {
                this.log(`Failed to create model texture "${textureId}"`, "warning");
            }
            markSceneChanged();
        });
    }
    /**
     * Create (or reuse) a pooled render item for one mesh of an entity.
     * @param materialData The mesh's material.
     * @param overrideData Optional per-entity material values that replace
     * the mesh material's (used for model parts).
     * @param worldMatrix World matrix to draw with (defaults to the entity's).
     * @param lodGeometryData Lower-detail versions of the mesh, if any.
     * @param lodSizes Screen sizes below which each lower level is used.
     */
    _addModelItem(entity, geometryData, materialData, overrideData = null, worldMatrix = entity._worldMatrix4?.matrix, lodGeometryData = null, lodSizes = null) {
        if (!worldMatrix) {
            return;
        }
        const geometry = this._getGeometry(geometryData);
        if (!geometry)
            return;
        let item = this._itemPool[this._itemCount];
        if (!item) {
            item = {
                entity,
                geometry,
                materialData: null,
                material: {
                    r: 1, g: 1, b: 1, a: 1,
                    metallic: 0, roughness: 0.5,
                    emissiveR: 0, emissiveG: 0, emissiveB: 0, emissiveIntensity: 0,
                    opacity: 1
                },
                textureKey: "",
                boneRow: -1,
                transparent: false,
                doubleSided: false,
                castShadow: true,
                worldMatrix,
                cx: 0, cy: 0, cz: 0, radius: -1,
                sortKey: 0,
                batchKey: "",
                depthKey: "",
                lodSizes: null,
                lodRadius: 0,
                lodLevel: 0,
                lodGeometries: [],
                lodBatchKeys: [],
                lodDepthKeys: [],
                drawGeometry: geometry
            };
            this._itemPool[this._itemCount] = item;
        }
        this._itemCount++;
        item.entity = entity;
        item.geometry = geometry;
        item.drawGeometry = geometry;
        item.materialData = materialData;
        item.worldMatrix = worldMatrix;
        // Resolve material values
        const mat = item.material;
        mat.r = 1;
        mat.g = 1;
        mat.b = 1;
        mat.a = 1;
        mat.metallic = 0;
        mat.roughness = 0.5;
        mat.emissiveR = 0;
        mat.emissiveG = 0;
        mat.emissiveB = 0;
        mat.emissiveIntensity = 0;
        mat.opacity = entity._opacity;
        item.blobTextureId = undefined;
        item.texture = entity._texture;
        if (materialData) {
            this._applyMaterialData(item, materialData);
        }
        if (overrideData) {
            this._applyMaterialData(item, overrideData);
        }
        if (item.blobTextureId) {
            item.textureKey = item.blobTextureId;
        }
        else if (item.texture) {
            item.textureKey = item.texture._id || item.texture.id();
        }
        else {
            item.textureKey = "";
        }
        item.transparent = mat.opacity < 1 || mat.a < 1 || !!materialData?.transparent || !!overrideData?.transparent ||
            !!(item.texture && item.texture._hasAlpha);
        item.doubleSided = !!(overrideData?.doubleSided ?? materialData?.doubleSided);
        item.castShadow = !entity._noShadowCast && !item.transparent;
        // Skeleton: compute skin matrices once per frame (dirty-guarded) and
        // give each skeleton a bone palette row for instanced draws.
        item.skeleton = geometry.isSkinned ? entity._skeleton : undefined;
        item.boneRow = -1;
        if (item.skeleton) {
            this._skeletonManager?.updateSkeletonMatrices(item.skeleton);
            if (this._bonePalette) {
                let row = this._skeletonRows.get(item.skeleton);
                if (row === undefined) {
                    row = this._bonePalette.addSkeleton(item.skeleton);
                    this._skeletonRows.set(item.skeleton, row);
                }
                item.boneRow = row;
            }
        }
        // World-space bounding sphere
        const m = item.worldMatrix;
        if (geometry.boundsRadius >= 0) {
            const lx = geometry.boundsCenterX, ly = geometry.boundsCenterY, lz = geometry.boundsCenterZ;
            item.cx = m[0] * lx + m[4] * ly + m[8] * lz + m[12];
            item.cy = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
            item.cz = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
            const sx = m[0] * m[0] + m[1] * m[1] + m[2] * m[2];
            const sy = m[4] * m[4] + m[5] * m[5] + m[6] * m[6];
            const sz = m[8] * m[8] + m[9] * m[9] + m[10] * m[10];
            const scale = Math.sqrt(Math.max(sx, sy, sz));
            item.radius = geometry.boundsRadius * scale;
            item.lodRadius = geometry.meshRadius * scale;
            // Skinned vertices are in bind space (often Z-up), not model
            // space, so their raw bounds can sit well away from the posed
            // character. Centre the sphere on the animated joints instead,
            // padded to cover the body around them.
            const skeleton = item.skeleton;
            if (skeleton && skeleton.data.boneCount > 0) {
                const w = skeleton.worldMatrices;
                let minX = Infinity, minY = Infinity, minZ = Infinity;
                let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
                for (let b = 0, n = skeleton.data.boneCount; b < n; b++) {
                    const x = w[b * 16 + 12], y = w[b * 16 + 13], z = w[b * 16 + 14];
                    if (x < minX)
                        minX = x;
                    if (y < minY)
                        minY = y;
                    if (z < minZ)
                        minZ = z;
                    if (x > maxX)
                        maxX = x;
                    if (y > maxY)
                        maxY = y;
                    if (z > maxZ)
                        maxZ = z;
                }
                const lx = (minX + maxX) / 2, ly = (minY + maxY) / 2, lz = (minZ + maxZ) / 2;
                const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
                const halfDiagonal = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2;
                item.cx = m[0] * lx + m[4] * ly + m[8] * lz + m[12];
                item.cy = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
                item.cz = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
                item.radius = (halfDiagonal + extent * 0.25) * scale;
            }
        }
        else {
            item.cx = m[12];
            item.cy = m[13];
            item.cz = m[14];
            item.radius = -1;
            item.lodRadius = -1;
        }
        const skinned = item.skeleton ? "|s" : "";
        // Double-sided items batch separately so culling can be set per batch
        const sided = item.doubleSided ? "|d" : "";
        item.batchKey = geometry.id + "|" + item.textureKey + skinned + sided;
        item.depthKey = geometry.id + skinned;
        // Level-of-detail geometry (index 0 is the full mesh)
        item.lodSizes = null;
        if (lodGeometryData && lodSizes && lodGeometryData.length > 0) {
            const geometries = item.lodGeometries;
            const batchKeys = item.lodBatchKeys;
            const depthKeys = item.lodDepthKeys;
            geometries.length = 0;
            batchKeys.length = 0;
            depthKeys.length = 0;
            geometries.push(geometry);
            batchKeys.push(item.batchKey);
            depthKeys.push(item.depthKey);
            for (let i = 0; i < lodGeometryData.length; i++) {
                const lodGeometry = this._getGeometry(lodGeometryData[i]);
                if (!lodGeometry)
                    break;
                geometries.push(lodGeometry);
                batchKeys.push(lodGeometry.id + "|" + item.textureKey + skinned + sided);
                depthKeys.push(lodGeometry.id + skinned);
            }
            // LOD needs a size to measure
            if (geometries.length > 1 && item.lodRadius > 0) {
                item.lodSizes = lodSizes;
            }
        }
        return item;
    }
    /**
     * Get the GPU geometry for geometry data, uploading it on first use.
     */
    _getGeometry(geometryData) {
        if (!this._geometryManager)
            return;
        const geometryId = geometryData.id || "unknown";
        let geometry = this._geometryManager.getGeometry(geometryId);
        if (!geometry) {
            geometry = this._geometryManager.createGeometryFromData(geometryId, geometryData) || undefined;
            if (!geometry)
                return;
            // Geometry creation binds buffers with raw GL calls
            this._stateManager?.reset();
        }
        return geometry;
    }
    /**
     * Pick an item's level of detail for a pass that draws it at
     * `pixelsPerUnit` (device pixels or shadow map texels per world unit).
     */
    _lodLevel(item, pixelsPerUnit) {
        const sizes = item.lodSizes;
        const size = item.lodRadius * 2 * pixelsPerUnit * this._lodBias;
        const max = item.lodGeometries.length - 1;
        let level = 0;
        while (level < max && size < sizes[level])
            level++;
        return level;
    }
    /**
     * Add a draw's triangle count to the frame stats.
     */
    _countTriangles(geometry, instances) {
        const vertices = geometry.indexCount > 0 ? geometry.indexCount : geometry.vertexCount;
        this._stats.triangles += Math.floor(vertices / 3) * instances;
    }
    /**
     * Copy the values present in a material onto a render item's resolved
     * material (fields that are absent are left unchanged).
     */
    _applyMaterialData(item, materialData) {
        const mat = item.material;
        const color = materialData.color;
        if (color) {
            if (typeof color === "object") {
                mat.r = color.r;
                mat.g = color.g;
                mat.b = color.b;
                mat.a = color.a ?? 1;
            }
            else {
                const rgb = parseHexColor(color);
                mat.r = rgb[0];
                mat.g = rgb[1];
                mat.b = rgb[2];
            }
        }
        if (materialData.metallic !== undefined)
            mat.metallic = materialData.metallic;
        if (materialData.roughness !== undefined)
            mat.roughness = materialData.roughness;
        if (materialData.emissiveColor) {
            mat.emissiveR = materialData.emissiveColor.r;
            mat.emissiveG = materialData.emissiveColor.g;
            mat.emissiveB = materialData.emissiveColor.b;
            mat.emissiveIntensity = materialData.emissiveIntensity ?? 1;
        }
        const textureId = materialData.textureId;
        if (textureId && this._textureManager) {
            if (this._textureManager.getBlobTexture(textureId)) {
                item.blobTextureId = textureId;
            }
            else if (materialData.textureBlob) {
                this._requestBlobTexture(textureId, materialData.textureBlob);
            }
        }
    }
    /**
     * Render a single viewport.
     */
    _renderViewport(viewport) {
        const gl = this._canvasContext;
        if (!gl || !this._cameraController || !this._stateManager) {
            return;
        }
        // Get viewport dimensions in CSS pixels and convert to device pixels.
        const dpr = this._devicePixelRatio;
        const vpX = Math.floor((viewport._translate?.x || 0) * dpr);
        const vpY = Math.floor((viewport._translate?.y || 0) * dpr);
        const vpWidth = Math.floor(viewport._bounds2d.x * dpr);
        const vpHeight = Math.floor(viewport._bounds2d.y * dpr);
        const camera = viewport.camera;
        const scene = viewport._scene;
        if (!camera || !scene) {
            return;
        }
        const data = this._sceneData.get(scene);
        if (!data)
            return;
        const matrices = this._cameraController.updateCamera(camera, viewport);
        const frustum = matrices.frustum;
        const camX = camera._translate.x;
        const camY = camera._translate.y;
        const camZ = camera._translate.z;
        // Device pixels per world unit, for picking levels of detail. An
        // orthographic view has one scale everywhere; a perspective view
        // divides it by each item's view depth.
        const proj = matrices.projection.matrix;
        const view = matrices.view.matrix;
        const viewScale = Math.sqrt(view[1] * view[1] + view[5] * view[5] + view[9] * view[9]);
        const pixelsPerUnit = proj[5] * viewScale * vpHeight * 0.5;
        const perspective = proj[11] !== 0;
        // ------------------------------------------------------------
        // Cull against the camera frustum and batch what remains
        // ------------------------------------------------------------
        const batcher = this._mainBatcher;
        const transparent = this._transparentItems;
        batcher.begin();
        transparent.length = 0;
        const frameId = this._frameId;
        const models = data.models;
        for (let i = 0; i < models.length; i++) {
            const item = models[i];
            if (item.radius >= 0 && !frustum.containsSphereXYZ(item.cx, item.cy, item.cz, item.radius)) {
                continue;
            }
            item.entity._lastRenderedFrame = frameId;
            const dx = item.cx - camX, dy = item.cy - camY, dz = item.cz - camZ;
            const distSq = dx * dx + dy * dy + dz * dz;
            let geometry = item.geometry;
            let batchKey = item.batchKey;
            item.lodLevel = 0;
            if (item.lodSizes) {
                let scale = pixelsPerUnit;
                if (perspective) {
                    const depth = -(view[2] * item.cx + view[6] * item.cy + view[10] * item.cz + view[14]);
                    scale /= Math.max(depth, 1e-3);
                }
                const level = this._lodLevel(item, scale);
                item.lodLevel = level;
                if (level > 0) {
                    geometry = item.lodGeometries[level];
                    batchKey = item.lodBatchKeys[level];
                    this._stats.lodItems++;
                }
            }
            item.drawGeometry = geometry;
            if (item.transparent) {
                item.sortKey = distSq;
                transparent.push(item);
            }
            else {
                // Front-to-back key: distance to the far side of the bounds, so
                // big surfaces like floors sort behind the things standing on them
                item.sortKey = Math.sqrt(distSq) + Math.max(item.radius, 0);
                batcher.add(item, batchKey, geometry);
            }
        }
        // Draw opaque geometry front to back (batches, and instances within
        // each batch) so the depth test rejects hidden pixels before the
        // expensive lighting runs. Dense crowds overlap heavily, so this
        // removes a lot of overdraw.
        const opaqueBatches = batcher.batches;
        for (let b = 0; b < opaqueBatches.length; b++) {
            const items = opaqueBatches[b].items;
            if (items.length > 1)
                items.sort(sortItemsFrontToBack);
        }
        if (opaqueBatches.length > 1)
            opaqueBatches.sort(sortBatchesFrontToBack);
        this._stats.visibleItems += transparent.length;
        for (const batch of opaqueBatches)
            this._stats.visibleItems += batch.items.length;
        const opaqueSprites = this._opaqueSprites;
        const transparentSprites = this._transparentSprites;
        opaqueSprites.length = 0;
        transparentSprites.length = 0;
        const sprites = data.sprites;
        for (let i = 0; i < sprites.length; i++) {
            const sprite = sprites[i];
            const m = sprite._worldMatrix4?.matrix;
            if (!m)
                continue;
            const radius = Math.max(sprite._bounds2d.x, sprite._bounds2d.y) * 0.75 *
                Math.max(Math.abs(sprite._scale.x), Math.abs(sprite._scale.y), 1e-6);
            if (!frustum.containsSphereXYZ(m[12], m[13], m[14], radius))
                continue;
            const spriteMaterial = sprite._materialData;
            const spriteColor = spriteMaterial?.color;
            if (sprite._opacity < 1 ||
                sprite._texture?._hasAlpha ||
                spriteMaterial?.blending === "additive" ||
                spriteMaterial?.transparent ||
                (typeof spriteColor === "object" && (spriteColor.a ?? 1) < 1)) {
                const dx = m[12] - camX, dy = m[13] - camY, dz = m[14] - camZ;
                sprite._webglSortKey = dx * dx + dy * dy + dz * dz;
                transparentSprites.push(sprite);
            }
            else {
                opaqueSprites.push(sprite);
            }
        }
        // ------------------------------------------------------------
        // Directional shadow map, centred on this viewport's view target
        // ------------------------------------------------------------
        if (this.shadowsEnabled() && this._shadowManager && this._shadowCastingLight && this._sharedShadowFrame !== this._frameId) {
            const target = camera._lookAt;
            const center = target ? this._shadowCenter(target.x, target.y, target.z) : { x: 0, y: 0, z: 0 };
            const lightSpaceMatrix = this._shadowManager.updateLightSpaceMatrix(this._shadowLightId, this._shadowCastingLight, { x: camX, y: camY, z: camZ }, center);
            if (lightSpaceMatrix) {
                this._renderDirectionalShadowPass(data, lightSpaceMatrix);
                this._stateManager.reset();
                gl.depthFunc(gl.LEQUAL);
            }
        }
        // ------------------------------------------------------------
        // Main pass
        // ------------------------------------------------------------
        this._stateManager.setViewport(vpX, vpY, vpWidth, vpHeight);
        // Always scissor the clear so split-screen viewports don't wipe each
        // other; drawing itself is already confined by gl.viewport.
        this._stateManager.setScissorTest(true);
        this._stateManager.setScissorBox(vpX, vpY, vpWidth, vpHeight);
        const cc = this._clearColor;
        gl.clearColor(cc.r, cc.g, cc.b, cc.a);
        this._stateManager.setDepthWrite(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (!viewport._clipping) {
            this._stateManager.setScissorTest(false);
        }
        // Opaque pass
        this._stateManager.setDepthTest(true);
        this._stateManager.setDepthWrite(true);
        this._stateManager.setDepthFunc(gl.LEQUAL);
        this._stateManager.setBlend(true);
        this._stateManager.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // A y-down 2D camera (preset "screen2d") draws sprites flat with
        // their full 2D transform, as the Canvas 2D renderer does
        const flat2d = !!(camera._up && camera._up.y < 0);
        this._renderSprites(opaqueSprites, matrices, flat2d);
        this._renderModelBatches(batcher.batches, matrices);
        // Ground decals go on top of the opaque ground, under everything
        // transparent
        this._renderDecalSystems(data.decals, matrices);
        // Transparent pass (back to front, no depth writes)
        this._stateManager.setDepthWrite(false);
        if (transparentSprites.length > 1) {
            transparentSprites.sort(sortSpritesBackToFront);
        }
        this._renderSprites(transparentSprites, matrices, flat2d);
        if (transparent.length > 0) {
            transparent.sort(sortItemsBackToFront);
            this._renderTransparentItems(transparent, matrices);
        }
        this._renderParticleSystems(data.particles, matrices);
        this._renderDebugLines(matrices);
        this._stateManager.setDepthWrite(true);
        this._stateManager.setScissorTest(false);
    }
    /**
     * Pick the program for a model batch.
     */
    _selectProgram(skinned, instanced, baseId, skinnedId) {
        const id = skinned ? skinnedId : baseId;
        return this._shaderManager?.getProgram(instanced ? `${id}_instanced` : id);
    }
    /**
     * Whether a batch should be drawn with a single instanced call.
     */
    _shouldInstance(batch) {
        if (!this._instancingEnabled || !this._instanceBuffer)
            return false;
        if (batch.items.length < this._minInstanceCount)
            return false;
        if (batch.skinned && !this._bonePalette)
            return false;
        return true;
    }
    /**
     * Draw a batch with one instanced call (geometry must already be bound).
     */
    _drawInstanced(batch, program) {
        const gl = this._canvasContext;
        const geometry = batch.geometry;
        const count = batch.items.length;
        this._instanceBuffer.upload(batch.items, 0, count);
        this._instanceBuffer.bind(program);
        if (geometry.indexBuffer && geometry.indexCount > 0) {
            // The instance buffer rebinds ARRAY_BUFFER only, the index buffer stays bound
            gl.drawElementsInstanced(geometry.drawMode, geometry.indexCount, geometry.indexType, 0, count);
        }
        else if (geometry.vertexCount > 0) {
            gl.drawArraysInstanced(geometry.drawMode, 0, geometry.vertexCount, count);
        }
        this._instanceBuffer.unbind();
        this._stats.instancedDrawCalls++;
        this._stats.instances += count;
        this._countTriangles(geometry, count);
    }
    /**
     * Point an instanced skinned program at the bone palette texture.
     */
    _bindBonePalette(program) {
        if (!this._bonePalette)
            return;
        program.setUniform1i("u_boneTexture", BONE_TEXTURE_UNIT);
        program.setUniform2f("u_boneTextureSize", this._bonePalette.width, Math.max(1, this._bonePalette.height));
        program.setUniform1i("u_useSkinning", 1);
    }
    /**
     * Upload one item's bone matrices to a non-instanced skinned program.
     */
    _uploadBoneUniforms(program, item) {
        const skeleton = item.skeleton;
        if (!skeleton) {
            program.setUniform1i("u_useSkinning", 0);
            return;
        }
        program.setUniform1i("u_useSkinning", 1);
        const location = program.getUniformLocation("u_boneMatrices[0]");
        if (location) {
            const boneCount = Math.min(skeleton.data.boneCount, MAX_BONES);
            this._canvasContext.uniformMatrix4fv(location, false, skeleton.skinMatrices.subarray(0, boneCount * 16));
        }
    }
    /**
     * Draw depth-only batches (shadow passes). `setup` applies the pass's
     * shared uniforms whenever the active program changes.
     */
    _drawDepthBatches(batches, baseId, skinnedId, setup) {
        if (!this._geometryManager)
            return;
        let current;
        for (let b = 0; b < batches.length; b++) {
            const batch = batches[b];
            const instanced = this._shouldInstance(batch);
            const program = this._selectProgram(batch.skinned, instanced, baseId, skinnedId);
            if (!program)
                continue;
            if (program !== current) {
                program.use();
                setup(program);
                current = program;
                if (batch.skinned && instanced) {
                    this._bindBonePalette(program);
                }
            }
            this._geometryManager.bindGeometry(batch.geometry, program);
            if (instanced) {
                this._drawInstanced(batch, program);
                this._stats.shadowDrawCalls++;
            }
            else {
                for (let i = 0; i < batch.items.length; i++) {
                    const item = batch.items[i];
                    program.setUniformMatrix4fv("u_worldMatrix", item.worldMatrix);
                    if (batch.skinned) {
                        this._uploadBoneUniforms(program, item);
                    }
                    this._geometryManager.drawGeometry(batch.geometry);
                    this._stats.shadowDrawCalls++;
                    this._countTriangles(batch.geometry, 1);
                }
            }
            this._geometryManager.unbindGeometry(batch.geometry, program);
        }
    }
    /**
     * Render the directional light's shadow map for one viewport. Casters
     * are culled against the light's own frustum (not the camera's), so
     * objects just off-screen still cast shadows into view.
     */
    _renderDirectionalShadowPass(data, lightSpaceMatrix) {
        if (!this._shadowManager)
            return;
        const shadowManager = this._shadowManager;
        const lightId = this._shadowLightId;
        this._lightFrustumMatrix.matrix.set(lightSpaceMatrix);
        this._lightFrustum.extractFromMatrix(this._lightFrustumMatrix);
        // Shadow map texels per world unit (orthographic light projection)
        const m = lightSpaceMatrix;
        const texelsPerUnit = Math.sqrt(m[0] * m[0] + m[4] * m[4] + m[8] * m[8]) *
            shadowManager.getShadowMapSize(lightId) * 0.5;
        // Cache static casters when this is the frame's only directional pass
        this._directionalPassesThisFrame++;
        const cache = this._shadowCaching && this._directionalPassesLastFrame <= 1
            ? shadowManager.getShadowCache(lightId)
            : null;
        const batcher = this._depthBatcher;
        const staticBatcher = this._staticDepthBatcher;
        batcher.begin();
        staticBatcher.begin();
        const frameId = this._frameId;
        let signatureA = 0, signatureB = 0, staticCount = 0, movingCount = 0;
        const models = data.models;
        for (let i = 0; i < models.length; i++) {
            const item = models[i];
            if (!item.castShadow)
                continue;
            if (item.radius >= 0 && !this._lightFrustum.containsSphereXYZ(item.cx, item.cy, item.cz, item.radius)) {
                continue;
            }
            const entity = item.entity;
            entity._lastRenderedFrame = frameId;
            let key = item.depthKey;
            let geometry = item.geometry;
            if (item.lodSizes) {
                const level = this._lodLevel(item, texelsPerUnit);
                key = item.lodDepthKeys[level];
                geometry = item.lodGeometries[level];
            }
            if (cache) {
                // New casters start out static (one extra rebuild if they turn
                // out to move); casters that moved wait until they settle
                if (entity._transformVersion !== entity._shadowSeenVersion) {
                    entity._shadowStableSince = entity._shadowSeenVersion === -1 ? -SHADOW_STATIC_FRAMES : frameId;
                    entity._shadowSeenVersion = entity._transformVersion;
                }
                if (!item.skeleton && frameId - entity._shadowStableSince >= SHADOW_STATIC_FRAMES) {
                    if (!entity._renderUid)
                        entity._renderUid = nextRenderUid++;
                    // Order-independent checksum of (entity, mesh, transform)
                    let h = Math.imul(entity._renderUid, 0x9e3779b1) ^ Math.imul(geometry.uid, 0x85ebca6b) ^ Math.imul(entity._transformVersion + 1, 0xc2b2ae35);
                    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
                    signatureA = (signatureA + h) | 0;
                    signatureB ^= Math.imul(h ^ (h >>> 13), 0x297a2d39);
                    staticCount++;
                    staticBatcher.add(item, key, geometry);
                    continue;
                }
                movingCount++;
            }
            batcher.add(item, key, geometry);
        }
        const setup = (program) => {
            program.setUniformMatrix4fv("u_lightSpaceMatrix", lightSpaceMatrix);
        };
        if (!cache) {
            if (!shadowManager.beginShadowPass(lightId))
                return;
            this._drawDepthBatches(batcher.batches, "shadow", "skinned_shadow", setup);
            shadowManager.endShadowPass();
            this._shadowMapHoldsCache = false;
            return;
        }
        // Redraw the cache only when the static casters or the frustum changed
        let sameMatrix = cache.valid;
        for (let k = 0; sameMatrix && k < 16; k++)
            sameMatrix = cache.matrix[k] === m[k];
        const cacheCurrent = sameMatrix && cache.count === staticCount &&
            cache.signatureA === signatureA && cache.signatureB === signatureB;
        if (!cacheCurrent) {
            if (shadowManager.beginShadowCachePass(lightId)) {
                this._drawDepthBatches(staticBatcher.batches, "shadow", "skinned_shadow", setup);
                shadowManager.endShadowPass();
            }
            cache.matrix.set(m);
            cache.count = staticCount;
            cache.signatureA = signatureA;
            cache.signatureB = signatureB;
            cache.valid = true;
            this._shadowMapHoldsCache = false;
            this._stats.shadowCacheRebuilds++;
        }
        // Nothing moving and the map already holds the cache: reuse it as is
        if (movingCount === 0 && this._shadowMapHoldsCache)
            return;
        shadowManager.copyShadowCache(lightId);
        if (movingCount > 0 && shadowManager.beginShadowPass(lightId, false)) {
            this._drawDepthBatches(batcher.batches, "shadow", "skinned_shadow", setup);
            shadowManager.endShadowPass();
        }
        this._shadowMapHoldsCache = movingCount === 0;
    }
    /**
     * Render point light shadow atlases (6 faces per shadow-casting light).
     * Runs once per frame; casters are every shadow-casting item in range of
     * the light across all scenes being rendered.
     */
    _renderPointLightShadowPasses() {
        if (!this._shadowManager) {
            return;
        }
        const batcher = this._depthBatcher;
        for (const pointLight of this._shadowCastingPointLights) {
            const lightId = pointLight.id();
            // Update the 6 light-space matrices for this light's current position
            if (!this._shadowManager.updatePointLightSpaceMatrices(lightId, pointLight)) {
                continue;
            }
            const pos = pointLight._translate;
            // Get the far plane from the shadow map data so depth pass and lookup match
            const shadowData = this._shadowManager.getPointShadowMapData(lightId);
            const farPlane = shadowData?.farPlane ?? (pointLight._range || 500);
            // Gather casters within the light's shadow range. Each cube face
            // has a 90 degree field of view, so an item at distance d covers
            // (faceSize / 2) / d texels per world unit.
            const halfFace = (shadowData?.faceSize ?? 512) * 0.5;
            const casters = this._pointCasterItems;
            const casterKeys = this._pointCasterKeys;
            const casterGeometries = this._pointCasterGeometries;
            casters.length = 0;
            casterKeys.length = 0;
            casterGeometries.length = 0;
            for (let i = 0; i < this._itemCount; i++) {
                const item = this._itemPool[i];
                if (!item.castShadow)
                    continue;
                let distance = 0;
                if (item.radius >= 0) {
                    const dx = item.cx - pos.x, dy = item.cy - pos.y, dz = item.cz - pos.z;
                    const reach = farPlane + item.radius;
                    const distSq = dx * dx + dy * dy + dz * dz;
                    if (distSq > reach * reach)
                        continue;
                    distance = Math.sqrt(distSq);
                }
                item.entity._lastRenderedFrame = this._frameId;
                casters.push(item);
                if (item.lodSizes && distance > 0) {
                    const level = this._lodLevel(item, halfFace / distance);
                    casterKeys.push(item.lodDepthKeys[level]);
                    casterGeometries.push(item.lodGeometries[level]);
                }
                else {
                    casterKeys.push(item.depthKey);
                    casterGeometries.push(item.geometry);
                }
            }
            for (let face = 0; face < 6; face++) {
                // Begin even when nothing falls in this face: it clears it
                if (!this._shadowManager.beginPointShadowPass(lightId, face)) {
                    continue;
                }
                const lightSpaceMatrix = this._shadowManager.getPointLightSpaceMatrix(lightId, face);
                if (!lightSpaceMatrix) {
                    this._shadowManager.endPointShadowPass();
                    continue;
                }
                // Only the casters inside this face's 90 degree frustum
                this._lightFrustum.extractFromMatrix(lightSpaceMatrix);
                batcher.begin();
                for (let c = 0; c < casters.length; c++) {
                    const item = casters[c];
                    if (item.radius >= 0 && !this._lightFrustum.containsSphereXYZ(item.cx, item.cy, item.cz, item.radius)) {
                        continue;
                    }
                    batcher.add(item, casterKeys[c], casterGeometries[c]);
                }
                this._drawDepthBatches(batcher.batches, "point_shadow", "skinned_point_shadow", (program) => {
                    program.setUniformMatrix4fv("u_lightSpaceMatrix", lightSpaceMatrix);
                    program.setUniform3f("u_pointLightPosition", pos.x, pos.y, pos.z);
                    program.setUniform1f("u_pointShadowFarPlane", farPlane);
                });
                this._shadowManager.endPointShadowPass();
            }
        }
    }
    /**
     * Set the per-viewport uniforms a lit program needs (camera, lights,
     * shadows, fog). Called whenever the active program changes.
     */
    _setupLitProgram(program, matrices) {
        program.setUniformMatrix4fv("u_viewMatrix", matrices.view);
        program.setUniformMatrix4fv("u_projectionMatrix", matrices.projection);
        program.setUniform3f("u_cameraPosition", matrices.cameraPosition.x, matrices.cameraPosition.y, matrices.cameraPosition.z);
        this._lightManager?.applyLightUniforms(program);
        if (this.shadowsEnabled() && this._shadowManager) {
            this._shadowManager.applyShadowUniforms(program, this._shadowLightId, SHADOW_TEXTURE_UNIT);
            program.setUniform1i("u_shadowDebug", this._shadowDebugMode);
        }
        else {
            program.setUniform1i("u_hasShadowMap", 0);
            program.setUniform1i("u_shadowDebug", 0);
            program.setUniformMatrix4fv("u_lightSpaceMatrix", IDENTITY_MATRIX);
        }
        program.setUniform1f("u_shadowNormalOffset", 0.0);
        if (this._shadowCastingPointLights.length > 0 && this._shadowManager && this._lightManager) {
            const count = Math.min(this._shadowCastingPointLights.length, 2);
            program.setUniform1i("u_numShadowPointLights", count);
            for (let i = 0; i < count; i++) {
                const light = this._shadowCastingPointLights[i];
                this._shadowManager.applyPointShadowUniforms(program, i, light.id(), POINT_SHADOW_TEXTURE_UNIT + i);
                const pointLightIndex = this._lightManager._pointLights.indexOf(light);
                program.setUniform1i(`u_pointShadowLightIndex[${i}]`, pointLightIndex);
            }
        }
        else {
            program.setUniform1i("u_numShadowPointLights", 0);
        }
        // The shadow manager binds its textures with raw GL calls
        this._stateManager?.invalidateTextureBindings();
        // Default to simple lighting mode (non-PBR)
        program.setUniform1i("u_usePBR", 0);
        program.setUniform1i("u_hasNormalMap", 0);
        program.setUniform1i("u_baseColorTexture", 0);
        const fog = this._fog;
        const fogMode = fog.mode === "linear" ? 1 : fog.mode === "exp2" ? 2 : 0;
        program.setUniform1i("u_fogMode", fogMode);
        if (fogMode) {
            program.setUniform3f("u_fogColor", fog.color.r, fog.color.g, fog.color.b);
            program.setUniform1f("u_fogNear", fog.near);
            program.setUniform1f("u_fogFar", fog.far);
            program.setUniform1f("u_fogDensity", fog.density);
        }
    }
    /**
     * Bind the base colour texture for a batch or item to unit 0.
     */
    _bindBaseTexture(blobTextureId, texture) {
        const textureManager = this._textureManager;
        let webGlTexture;
        if (blobTextureId) {
            webGlTexture = textureManager.getBlobTexture(blobTextureId);
        }
        else if (texture) {
            webGlTexture = textureManager.getTextureForIgeTexture(texture);
            // Lazily created textures are uploaded with raw GL binds
            this._stateManager.invalidateTextureBindings();
        }
        this._stateManager.bindTexture(webGlTexture || textureManager.getDefaultWhiteTexture(), 0);
    }
    /**
     * Set one item's per-draw uniforms on a non-instanced lit program.
     */
    _applyItemUniforms(program, item) {
        const mat = item.material;
        program.setUniformMatrix4fv("u_worldMatrix", item.worldMatrix);
        program.setUniform4f("u_baseColor", mat.r, mat.g, mat.b, mat.a);
        program.setUniform1f("u_opacity", mat.opacity);
        program.setUniform1f("u_metallic", mat.metallic);
        program.setUniform1f("u_roughness", mat.roughness);
        program.setUniform3f("u_emissiveColor", mat.emissiveR, mat.emissiveG, mat.emissiveB);
        program.setUniform1f("u_emissiveIntensity", mat.emissiveIntensity);
    }
    /**
     * Render opaque model batches with the lit shaders, instancing where
     * possible. Supports skinned meshes with skeletal animation.
     */
    _renderModelBatches(batches, matrices) {
        if (!this._geometryManager || !this._textureManager || !this._stateManager) {
            return;
        }
        let current;
        for (let b = 0; b < batches.length; b++) {
            const batch = batches[b];
            const instanced = this._shouldInstance(batch);
            const program = this._selectProgram(batch.skinned, instanced, "lit", "skinned");
            if (!program)
                continue;
            if (program !== current) {
                program.use();
                this._setupLitProgram(program, matrices);
                current = program;
            }
            this._geometryManager.bindGeometry(batch.geometry, program);
            this._bindBaseTexture(batch.blobTextureId, batch.texture);
            program.setUniform1i("u_hasVertexColors", batch.geometry.hasVertexColors ? 1 : 0);
            if (this._backFaceCulling) {
                // Shadow passes cull front faces with raw GL calls
                this._stateManager.setCullFaceMode(this._canvasContext.BACK);
                this._stateManager.setCullFace(!batch.items[0].doubleSided);
            }
            if (instanced) {
                if (batch.skinned) {
                    this._bindBonePalette(program);
                }
                this._drawInstanced(batch, program);
            }
            else {
                for (let i = 0; i < batch.items.length; i++) {
                    const item = batch.items[i];
                    this._applyItemUniforms(program, item);
                    if (batch.skinned) {
                        this._uploadBoneUniforms(program, item);
                    }
                    this._geometryManager.drawGeometry(batch.geometry);
                    this._stats.drawCalls++;
                    this._countTriangles(batch.geometry, 1);
                }
            }
            this._geometryManager.unbindGeometry(batch.geometry, program);
        }
        // Everything drawn after opaque meshes is double-sided
        this._stateManager.setCullFace(false);
    }
    /**
     * Render transparent model items one at a time in back-to-front order.
     */
    _renderTransparentItems(items, matrices) {
        if (!this._geometryManager || !this._textureManager || !this._stateManager) {
            return;
        }
        let current;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const skinned = !!item.skeleton;
            const program = this._selectProgram(skinned, false, "lit", "skinned");
            if (!program)
                continue;
            if (program !== current) {
                program.use();
                this._setupLitProgram(program, matrices);
                current = program;
            }
            const geometry = item.drawGeometry;
            this._geometryManager.bindGeometry(geometry, program);
            this._bindBaseTexture(item.blobTextureId, item.texture);
            program.setUniform1i("u_hasVertexColors", geometry.hasVertexColors ? 1 : 0);
            this._applyItemUniforms(program, item);
            if (skinned) {
                this._uploadBoneUniforms(program, item);
            }
            this._geometryManager.drawGeometry(geometry);
            this._geometryManager.unbindGeometry(geometry, program);
            this._stats.drawCalls++;
            this._countTriangles(geometry, 1);
        }
    }
    /**
     * Upload a particle or decal system's packed render data to its own
     * GPU buffer (once per frame, only when it changed). Buffers of systems
     * that haven't been seen for a while are deleted.
     */
    _uploadInstanceData(system, floatsPerInstance) {
        const gl = this._canvasContext;
        if (!gl || !this._instanceBuffer)
            return;
        let entry = this._particleBuffers.get(system);
        if (!entry) {
            entry = { buffer: gl.createBuffer(), version: -1, lastFrame: 0 };
            this._particleBuffers.set(system, entry);
        }
        entry.lastFrame = this._frameId;
        const { data, count } = system.renderData();
        if (count > 0 && entry.version !== system._renderVersion) {
            gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * floatsPerInstance), gl.STREAM_DRAW);
            entry.version = system._renderVersion;
        }
        // Periodically free buffers belonging to systems no longer rendered
        if ((this._frameId & 127) === 0) {
            this._particleBuffers.forEach((value, key) => {
                if (this._frameId - value.lastFrame > 120) {
                    if (value.buffer)
                        gl.deleteBuffer(value.buffer);
                    this._particleBuffers.delete(key);
                }
            });
        }
    }
    /**
     * A soft round white dot, used by particle systems without a texture.
     */
    _getDefaultParticleTexture() {
        if (this._defaultParticleTexture || !this._canvasContext) {
            return this._defaultParticleTexture;
        }
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return null;
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(0.4, "rgba(255,255,255,0.8)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        const gl = this._canvasContext;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this._stateManager?.invalidateTextureBindings();
        this._defaultParticleTexture = texture;
        return texture;
    }
    /**
     * The built-in decal texture: a 2x2 atlas of white splats (alpha is the
     * shape) for IgeDecalSystem3d without a texture of its own. Generated
     * from a fixed seed so every run looks the same.
     */
    _getDefaultDecalTexture() {
        if (this._defaultDecalTexture || !this._canvasContext) {
            return this._defaultDecalTexture;
        }
        const cell = 128;
        const canvas = document.createElement("canvas");
        canvas.width = cell * 2;
        canvas.height = cell * 2;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return null;
        let seed = 1337;
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };
        const blob = (x, y, radius, alpha) => {
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
            gradient.addColorStop(0.85, `rgba(255,255,255,${alpha * 0.8})`);
            gradient.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        };
        for (let c = 0; c < 4; c++) {
            const cx = (c % 2) * cell + cell / 2;
            const cy = Math.floor(c / 2) * cell + cell / 2;
            const maxReach = cell / 2 - 6; // keep clear of neighbouring cells
            // Main pool: overlapping lobes around the centre
            const lobes = 5 + Math.floor(random() * 4);
            for (let i = 0; i < lobes; i++) {
                const angle = random() * Math.PI * 2;
                const distance = random() * 14;
                blob(cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance, 16 + random() * 14, 0.95);
            }
            // Splashes thrown outwards, getting smaller with distance
            const drops = 8 + Math.floor(random() * 10);
            for (let i = 0; i < drops; i++) {
                const angle = random() * Math.PI * 2;
                const distance = 26 + random() * (maxReach - 34);
                const radius = Math.max(1.5, 7 - distance / 9) * (0.6 + random() * 0.6);
                blob(cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance, radius, 0.9);
            }
        }
        const gl = this._canvasContext;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this._stateManager?.invalidateTextureBindings();
        this._defaultDecalTexture = texture;
        return texture;
    }
    /**
     * Draw decal systems as quads lying on the ground: one instanced call
     * per system (WebGL 2) or one call per decal (WebGL 1). Drawn after the
     * opaque pass with depth testing, no depth writes and a polygon offset
     * so they never fight with the ground they lie on.
     */
    _renderDecalSystems(systems, matrices) {
        if (systems.length === 0 || !this._shaderManager || !this._geometryManager || !this._stateManager || !this._textureManager) {
            return;
        }
        const gl = this._canvasContext;
        const instanced = !!this._instanceBuffer;
        const program = this._shaderManager.getProgram(instanced ? "decal_instanced" : "decal");
        const quad = this._geometryManager.getSharedQuadGeometry();
        if (!program || !quad)
            return;
        let programReady = false;
        const stride = DECAL_INSTANCE_FLOATS * 4;
        for (let s = 0; s < systems.length; s++) {
            const system = systems[s];
            const { data, count } = system.renderData();
            if (count === 0)
                continue;
            const c = system._boundsCenter;
            if (!matrices.frustum.containsSphereXYZ(c.x, c.y, c.z, system._boundsRadius))
                continue;
            system._lastRenderedFrame = this._frameId;
            if (!programReady) {
                program.use();
                program.setUniformMatrix4fv("u_viewMatrix", matrices.view);
                program.setUniformMatrix4fv("u_projectionMatrix", matrices.projection);
                program.setUniform1i("u_texture", 0);
                const cam = matrices.cameraPosition;
                program.setUniform3f("u_cameraPosition", cam.x, cam.y, cam.z);
                const fog = this._fog;
                const fogMode = fog.mode === "linear" ? 1 : fog.mode === "exp2" ? 2 : 0;
                program.setUniform1i("u_fogMode", fogMode);
                program.setUniform1f("u_fogNear", fog.near);
                program.setUniform1f("u_fogFar", fog.far);
                program.setUniform1f("u_fogDensity", fog.density);
                this._geometryManager.bindGeometry(quad, program);
                this._stateManager.setDepthTest(true);
                this._stateManager.setDepthWrite(false);
                this._stateManager.setBlend(true);
                gl.enable(gl.POLYGON_OFFSET_FILL);
                gl.polygonOffset(-1, -4);
                programReady = true;
            }
            const multiply = system._options.blending !== "normal";
            program.setUniform1i("u_multiply", multiply ? 1 : 0);
            if (multiply) {
                this._stateManager.setBlendFunc(gl.DST_COLOR, gl.ZERO);
            }
            else {
                this._stateManager.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            }
            program.setUniform1f("u_atlasGrid", system.atlasGrid());
            const texture = system._options.texture
                ? this._textureManager.getTextureForIgeTexture(system._options.texture)
                : this._getDefaultDecalTexture();
            this._stateManager.invalidateTextureBindings();
            this._stateManager.bindTexture(texture || this._textureManager.getDefaultWhiteTexture(), 0);
            if (instanced) {
                const entry = this._particleBuffers.get(system);
                if (!entry || !entry.buffer)
                    continue;
                const gl2 = gl;
                const locations = [
                    program.getAttributeLocation("a_decal"),
                    program.getAttributeLocation("a_decalColor"),
                    program.getAttributeLocation("a_decalShape")
                ];
                gl2.bindBuffer(gl2.ARRAY_BUFFER, entry.buffer);
                for (let a = 0; a < locations.length; a++) {
                    if (locations[a] < 0)
                        continue;
                    gl2.enableVertexAttribArray(locations[a]);
                    gl2.vertexAttribPointer(locations[a], 4, gl2.FLOAT, false, stride, a * 16);
                    gl2.vertexAttribDivisor(locations[a], 1);
                }
                gl2.drawElementsInstanced(quad.drawMode, quad.indexCount, quad.indexType, 0, count);
                for (const location of locations) {
                    if (location < 0)
                        continue;
                    gl2.vertexAttribDivisor(location, 0);
                    gl2.disableVertexAttribArray(location);
                }
                this._stats.instancedDrawCalls++;
                this._stats.instances += count;
            }
            else {
                for (let i = 0; i < count; i++) {
                    const o = i * DECAL_INSTANCE_FLOATS;
                    program.setUniform4f("u_decal", data[o], data[o + 1], data[o + 2], data[o + 3]);
                    program.setUniform4f("u_decalColor", data[o + 4], data[o + 5], data[o + 6], data[o + 7]);
                    program.setUniform4f("u_decalShape", data[o + 8], data[o + 9], 0, 0);
                    this._geometryManager.drawGeometry(quad);
                    this._stats.drawCalls++;
                }
            }
        }
        if (programReady) {
            gl.disable(gl.POLYGON_OFFSET_FILL);
            this._geometryManager.unbindGeometry(quad, program);
            this._stateManager.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            this._stateManager.setDepthWrite(true);
        }
        this._renderProjectedDecals(systems, matrices);
    }
    /**
     * Draw projected decals (IgeDecalSystem3d.project()): each system's
     * decal triangles are one world-space vertex buffer and one draw call.
     */
    _renderProjectedDecals(systems, matrices) {
        const gl = this._canvasContext;
        const program = this._shaderManager.getProgram("decal_mesh");
        if (!program)
            return;
        let programReady = false;
        const stride = DECAL_MESH_VERTEX_FLOATS * 4;
        const locations = [
            program.getAttributeLocation("a_position"),
            program.getAttributeLocation("a_uv"),
            program.getAttributeLocation("a_color")
        ];
        const sizes = [3, 2, 4];
        const offsets = [0, 12, 20];
        for (let s = 0; s < systems.length; s++) {
            const system = systems[s];
            const { data, vertexCount } = system.meshRenderData();
            if (vertexCount === 0)
                continue;
            const c = system._meshBoundsCenter;
            if (!matrices.frustum.containsSphereXYZ(c.x, c.y, c.z, system._meshBoundsRadius))
                continue;
            let entry = this._decalMeshBuffers.get(system);
            if (!entry) {
                entry = { buffer: gl.createBuffer(), version: -1, lastFrame: 0 };
                this._decalMeshBuffers.set(system, entry);
            }
            entry.lastFrame = this._frameId;
            if (!programReady) {
                program.use();
                program.setUniformMatrix4fv("u_viewMatrix", matrices.view);
                program.setUniformMatrix4fv("u_projectionMatrix", matrices.projection);
                program.setUniform1i("u_texture", 0);
                const cam = matrices.cameraPosition;
                program.setUniform3f("u_cameraPosition", cam.x, cam.y, cam.z);
                const fog = this._fog;
                program.setUniform1i("u_fogMode", fog.mode === "linear" ? 1 : fog.mode === "exp2" ? 2 : 0);
                program.setUniform1f("u_fogNear", fog.near);
                program.setUniform1f("u_fogFar", fog.far);
                program.setUniform1f("u_fogDensity", fog.density);
                this._stateManager.setDepthTest(true);
                this._stateManager.setDepthWrite(false);
                this._stateManager.setBlend(true);
                gl.enable(gl.POLYGON_OFFSET_FILL);
                gl.polygonOffset(-1, -4);
                programReady = true;
            }
            // Raw buffer binding (the geometry manager doesn't own this buffer)
            gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
            if (entry.version !== system._meshRenderVersion) {
                gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, vertexCount * DECAL_MESH_VERTEX_FLOATS), gl.DYNAMIC_DRAW);
                entry.version = system._meshRenderVersion;
            }
            for (let a = 0; a < locations.length; a++) {
                if (locations[a] < 0)
                    continue;
                gl.enableVertexAttribArray(locations[a]);
                gl.vertexAttribPointer(locations[a], sizes[a], gl.FLOAT, false, stride, offsets[a]);
            }
            const multiply = system._options.blending !== "normal";
            program.setUniform1i("u_multiply", multiply ? 1 : 0);
            if (multiply) {
                this._stateManager.setBlendFunc(gl.DST_COLOR, gl.ZERO);
            }
            else {
                this._stateManager.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            }
            const texture = system._options.texture
                ? this._textureManager.getTextureForIgeTexture(system._options.texture)
                : this._getDefaultDecalTexture();
            this._stateManager.invalidateTextureBindings();
            this._stateManager.bindTexture(texture || this._textureManager.getDefaultWhiteTexture(), 0);
            gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
            this._stats.drawCalls++;
            for (const location of locations) {
                if (location >= 0)
                    gl.disableVertexAttribArray(location);
            }
        }
        if (programReady) {
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.disable(gl.POLYGON_OFFSET_FILL);
            this._stateManager.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            this._stateManager.setDepthWrite(true);
        }
        // Free buffers of systems no longer drawn
        if ((this._frameId & 127) === 0) {
            this._decalMeshBuffers.forEach((value, key) => {
                if (this._frameId - value.lastFrame > 120) {
                    if (value.buffer)
                        gl.deleteBuffer(value.buffer);
                    this._decalMeshBuffers.delete(key);
                }
            });
        }
    }
    /**
     * Draw particle systems as camera-facing quads: one instanced call per
     * system (WebGL 2) or one call per particle (WebGL 1). Drawn after the
     * transparent pass with depth testing but no depth writes.
     */
    _renderParticleSystems(systems, matrices) {
        if (systems.length === 0 || !this._shaderManager || !this._geometryManager || !this._stateManager || !this._textureManager) {
            return;
        }
        const gl = this._canvasContext;
        const instanced = !!this._instanceBuffer;
        const program = this._shaderManager.getProgram(instanced ? "particle_instanced" : "particle");
        const quad = this._geometryManager.getSharedQuadGeometry();
        if (!program || !quad)
            return;
        let programReady = false;
        let additive;
        for (let s = 0; s < systems.length; s++) {
            const system = systems[s];
            const { data, count } = system.renderData();
            if (count === 0)
                continue;
            const c = system._boundsCenter;
            if (!matrices.frustum.containsSphereXYZ(c.x, c.y, c.z, system._boundsRadius))
                continue;
            system._lastRenderedFrame = this._frameId;
            if (!programReady) {
                program.use();
                program.setUniformMatrix4fv("u_viewMatrix", matrices.view);
                program.setUniformMatrix4fv("u_projectionMatrix", matrices.projection);
                program.setUniform1i("u_texture", 0);
                this._geometryManager.bindGeometry(quad, program);
                this._stateManager.setDepthTest(true);
                this._stateManager.setDepthWrite(false);
                this._stateManager.setBlend(true);
                programReady = true;
            }
            const wantAdditive = system._options.blending !== "normal";
            if (wantAdditive !== additive) {
                this._stateManager.setBlendFunc(gl.SRC_ALPHA, wantAdditive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
                additive = wantAdditive;
            }
            const texture = system._options.texture
                ? this._textureManager.getTextureForIgeTexture(system._options.texture)
                : this._getDefaultParticleTexture();
            this._stateManager.invalidateTextureBindings();
            this._stateManager.bindTexture(texture || this._textureManager.getDefaultWhiteTexture(), 0);
            if (instanced) {
                const entry = this._particleBuffers.get(system);
                if (!entry || !entry.buffer)
                    continue;
                const gl2 = gl;
                const particleLoc = program.getAttributeLocation("a_particle");
                const colorLoc = program.getAttributeLocation("a_particleColor");
                gl2.bindBuffer(gl2.ARRAY_BUFFER, entry.buffer);
                gl2.enableVertexAttribArray(particleLoc);
                gl2.vertexAttribPointer(particleLoc, 4, gl2.FLOAT, false, PARTICLE_FLOATS * 4, 0);
                gl2.vertexAttribDivisor(particleLoc, 1);
                gl2.enableVertexAttribArray(colorLoc);
                gl2.vertexAttribPointer(colorLoc, 4, gl2.FLOAT, false, PARTICLE_FLOATS * 4, 16);
                gl2.vertexAttribDivisor(colorLoc, 1);
                gl2.drawElementsInstanced(quad.drawMode, quad.indexCount, quad.indexType, 0, count);
                gl2.vertexAttribDivisor(particleLoc, 0);
                gl2.vertexAttribDivisor(colorLoc, 0);
                gl2.disableVertexAttribArray(particleLoc);
                gl2.disableVertexAttribArray(colorLoc);
                this._stats.instancedDrawCalls++;
                this._stats.instances += count;
            }
            else {
                for (let i = 0; i < count; i++) {
                    const o = i * PARTICLE_FLOATS;
                    program.setUniform4f("u_particle", data[o], data[o + 1], data[o + 2], data[o + 3]);
                    program.setUniform4f("u_particleColor", data[o + 4], data[o + 5], data[o + 6], data[o + 7]);
                    this._geometryManager.drawGeometry(quad);
                    this._stats.drawCalls++;
                }
            }
        }
        if (programReady) {
            this._geometryManager.unbindGeometry(quad, program);
            this._stateManager.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            this._stateManager.setDepthWrite(true);
        }
    }
    /**
     * Render 2D sprites (textured quads, billboarded to face the camera).
     */
    _renderSprites(sprites, matrices, flat2d = false) {
        if (sprites.length === 0 || !this._shaderManager || !this._geometryManager || !this._textureManager || !this._stateManager) {
            return;
        }
        const spriteProgram = this._shaderManager.getProgram("sprite");
        const quadGeometry = this._geometryManager.getSharedQuadGeometry();
        if (!spriteProgram || !quadGeometry) {
            return;
        }
        spriteProgram.use();
        spriteProgram.setUniformMatrix4fv("u_viewMatrix", matrices.view);
        spriteProgram.setUniformMatrix4fv("u_projectionMatrix", matrices.projection);
        spriteProgram.setUniform1i("u_texture", 0);
        spriteProgram.setUniform1f("u_flipY", flat2d ? -1 : 1);
        this._geometryManager.bindGeometry(quadGeometry, spriteProgram);
        const gl = this._canvasContext;
        let boundTexture;
        let additive = false;
        for (let i = 0; i < sprites.length; i++) {
            const entity = sprites[i];
            const texture = entity._texture;
            const material = entity._materialData;
            // Smart textures and bitmap font sheets are drawn per entity (they
            // read its data, text and size)
            const perEntity = texture._renderMode === IgeTextureRenderMode.smartTexture || texture._rendersPerEntity;
            if (perEntity) {
                const webglTexture = this._textureManager.getSmartTexture(texture, entity, this._devicePixelRatio, this._frameId);
                this._stateManager.invalidateTextureBindings();
                this._stateManager.bindTexture(webglTexture || this._textureManager.getDefaultWhiteTexture(), 0);
                boundTexture = undefined;
            }
            else if (texture !== boundTexture) {
                const webglTexture = this._textureManager.getTextureForIgeTexture(texture);
                this._stateManager.invalidateTextureBindings();
                if (webglTexture) {
                    this._stateManager.bindTexture(webglTexture, 0);
                }
                boundTexture = texture;
            }
            // Additive sprites brighten what's behind them (fire, sparks, magic)
            const wantAdditive = material?.blending === "additive";
            if (wantAdditive !== additive) {
                this._stateManager.setBlendFunc(gl.SRC_ALPHA, wantAdditive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
                additive = wantAdditive;
            }
            // Sprite sheet cell (cells are 1-based [x, y, width, height] in pixels)
            const cells = texture._cells;
            const cell = cells && entity._cell ? cells[entity._cell] : undefined;
            const texW = texture._sizeX;
            const texH = texture._sizeY;
            if (!perEntity && cell && texW > 0 && texH > 0) {
                spriteProgram.setUniform4f("u_uvBounds", cell[0] / texW, cell[1] / texH, (cell[0] + cell[2]) / texW, (cell[1] + cell[3]) / texH);
            }
            else {
                spriteProgram.setUniform4f("u_uvBounds", 0, 0, 1, 1);
            }
            // Tint from the entity's material colour
            const color = material?.color;
            if (color && typeof color === "object") {
                spriteProgram.setUniform4f("u_tint", color.r, color.g, color.b, color.a ?? 1);
            }
            else if (typeof color === "string") {
                const rgb = parseHexColor(color);
                spriteProgram.setUniform4f("u_tint", rgb[0], rgb[1], rgb[2], 1);
            }
            else {
                spriteProgram.setUniform4f("u_tint", 1, 1, 1, 1);
            }
            spriteProgram.setUniformMatrix4fv("u_worldMatrix", entity._worldMatrix4);
            spriteProgram.setUniform2f("u_scale", entity._bounds2d.x, entity._bounds2d.y);
            spriteProgram.setUniform1f("u_opacity", entity._opacity);
            spriteProgram.setUniform1i("u_billboardMode", flat2d ? 0 : entity._billboardMode);
            this._geometryManager.drawGeometry(quadGeometry);
            this._stats.drawCalls++;
        }
        if (additive) {
            this._stateManager.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        this._geometryManager.unbindGeometry(quadGeometry, spriteProgram);
    }
    /**
     * Get the light manager for adding/removing scene lights.
     */
    get lightManager() {
        return this._lightManager;
    }
    /**
     * Get the shadow manager for shadow configuration.
     */
    get shadowManager() {
        return this._shadowManager;
    }
    /**
     * Get the skeleton manager for skeletal animation.
     */
    get skeletonManager() {
        return this._skeletonManager;
    }
    /**
     * Enable shadow casting for a directional light.
     * @param light The directional light to cast shadows
     * @param shadowMapSize Size of the shadow map texture (default: 1024)
     */
    enableShadows(light, shadowMapSize = 1024) {
        if (!this._shadowManager) {
            this.log("Shadow manager not initialized", "error");
            return false;
        }
        // Create shadow map for this light
        const success = this._shadowManager.createShadowMap(this._shadowLightId, {
            size: shadowMapSize,
            bias: light.shadowBias(),
            normalBias: 0.0
        });
        if (success) {
            this._shadowCastingLight = light;
            light.castShadow(true);
            this.log(`Shadows enabled for directional light (${shadowMapSize}x${shadowMapSize})`);
        }
        return success;
    }
    /**
     * Disable shadow casting.
     */
    disableShadows() {
        if (!this._shadowManager)
            return;
        this._shadowManager.deleteShadowMap(this._shadowLightId);
        if (this._shadowCastingLight) {
            this._shadowCastingLight.castShadow(false);
        }
        this._shadowCastingLight = undefined;
        this.log("Shadows disabled");
    }
    /**
     * Enable shadow casting for a point light.
     * Maximum of 2 shadow-casting point lights supported.
     * @param light The point light to cast shadows
     * @param shadowMapSize Size of each shadow map face (default: 512)
     */
    enablePointLightShadows(light, shadowMapSize = 512) {
        if (!this._shadowManager) {
            this.log("Shadow manager not initialized", "error");
            return false;
        }
        if (this._shadowCastingPointLights.length >= 2) {
            this.log("Maximum of 2 shadow-casting point lights reached", "warning");
            return false;
        }
        if (this._shadowCastingPointLights.includes(light)) {
            return true; // Already enabled
        }
        const range = light._range || 500;
        const success = this._shadowManager.createPointShadowMap(light.id(), {
            size: shadowMapSize,
            bias: 0.0,
            nearPlane: 0.5,
            farPlane: 1000
        });
        if (success) {
            this._shadowCastingPointLights.push(light);
            light.castShadow(true);
            this.log(`Point light shadows enabled for ${light.id()} (6x ${shadowMapSize}x${shadowMapSize})`);
        }
        return success;
    }
    /**
     * Disable shadow casting for a specific point light.
     */
    disablePointLightShadows(light) {
        if (!this._shadowManager)
            return;
        const index = this._shadowCastingPointLights.indexOf(light);
        if (index === -1)
            return;
        this._shadowManager.deletePointShadowMap(light.id());
        light.castShadow(false);
        this._shadowCastingPointLights.splice(index, 1);
        this.log(`Point light shadows disabled for ${light.id()}`);
    }
    /**
     * Check if shadows are enabled.
     */
    shadowsEnabled() {
        return !!(this._shadowManager?.enabled() && this._shadowCastingLight);
    }
    /**
     * Get or set shadow debug mode.
     * 0 = normal rendering
     * 1 = visualize projected UV coordinates
     * 2 = visualize fragment depth in light space
     * 3 = visualize sampled shadow map depth
     * 4 = visualize depth comparison (red=shadow, green=lit)
     */
    shadowDebugMode(mode) {
        if (mode !== undefined) {
            this._shadowDebugMode = mode;
            return this;
        }
        return this._shadowDebugMode;
    }
    /**
     * Toggle fullscreen mode.
     */
    toggleFullScreen = () => {
        if (!this._canvasElement)
            return;
        if (!document.fullscreenElement) {
            this._canvasElement.requestFullscreen().catch((err) => {
                this.log(`Error attempting to enable fullscreen: ${err.message}`, "error");
            });
        }
        else {
            document.exitFullscreen();
        }
    };
    preferredWebGlVersion(val) {
        if (val === undefined) {
            return this._preferredWebGlVersion;
        }
        this._preferredWebGlVersion = val;
        return this;
    }
    preserveDrawingBuffer(val) {
        if (val === undefined) {
            return this._preserveDrawingBuffer;
        }
        this._preserveDrawingBuffer = val;
        return this;
    }
    /**
     * Read the RGBA color of a single pixel at the given screen coordinates.
     * Requires preserveDrawingBuffer to be true (set before context creation).
     * @param x Screen X coordinate (0 = left edge)
     * @param y Screen Y coordinate (0 = top edge, DOM convention)
     * @returns Uint8Array [R, G, B, A] or null if context unavailable
     */
    readPixel(x, y) {
        const gl = this._canvasContext;
        if (!gl || !this._canvasElement)
            return null;
        const pixel = new Uint8Array(4);
        // Convert from DOM top-left origin to WebGL bottom-left origin
        const glY = this._canvasElement.height - Math.round(y) - 1;
        gl.readPixels(Math.round(x), glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return pixel;
    }
    /**
     * Read all pixels from the current framebuffer.
     * Requires preserveDrawingBuffer to be true.
     * Returns pixel data in WebGL native format (bottom-left origin, RGBA).
     */
    readAllPixels() {
        const gl = this._canvasContext;
        if (!gl || !this._canvasElement)
            return null;
        const w = this._canvasElement.width;
        const h = this._canvasElement.height;
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return pixels;
    }
    /**
     * Returns the underlying WebGL rendering context, if available.
     */
    glContext() {
        return this._canvasContext;
    }
    /**
     * Clean up and destroy the renderer.
     */
    destroy() {
        if (this._canvasElement) {
            // Remove event listeners
            this._canvasElement.removeEventListener("webglcontextlost", this._handleContextLost);
            this._canvasElement.removeEventListener("webglcontextrestored", this._handleContextRestored);
        }
        // Clean up managers
        this._particleBuffers.forEach((entry) => {
            if (entry.buffer)
                this._canvasContext?.deleteBuffer(entry.buffer);
        });
        this._particleBuffers.clear();
        if (this._defaultParticleTexture)
            this._canvasContext?.deleteTexture(this._defaultParticleTexture);
        this._instanceBuffer?.destroy();
        this._bonePalette?.destroy();
        this._geometryManager?.cleanup();
        this._shaderManager?.deleteAllPrograms();
        this._textureManager?.clearState();
        this._cameraController?.clearCache();
        this._skeletonManager?.cleanup();
        this._resourceManager?.cleanup();
        // Lose WebGL context
        const loseContext = this._canvasContext?.getExtension("WEBGL_lose_context");
        if (loseContext) {
            loseContext.loseContext();
        }
        // Remove canvas
        if (this._createdFrontBuffer && this._canvasElement) {
            ige.input.destroyListeners(this._canvasElement);
            document.body.removeChild(this._canvasElement);
        }
        this._canvasContext = null;
        delete this._canvasElement;
        ige.engine.headless(true);
        super.destroy();
    }
}
