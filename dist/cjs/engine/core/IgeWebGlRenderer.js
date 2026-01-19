"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeWebGlRenderer = void 0;
const IgeBaseRenderer_1 = require("./IgeBaseRenderer.js");
const IgePoint2d_1 = require("./IgePoint2d.js");
const instance_1 = require("../instance.js");
const clientServer_1 = require("../utils/clientServer.js");
const IgeWebGlResourceManager_1 = require("../webgl/IgeWebGlResourceManager.js");
const IgeWebGlShaderManager_1 = require("../webgl/IgeWebGlShaderManager.js");
const IgeWebGlTextureManager_1 = require("../webgl/IgeWebGlTextureManager.js");
const IgeWebGlGeometryManager_1 = require("../webgl/IgeWebGlGeometryManager.js");
const IgeWebGlCameraController_1 = require("../webgl/IgeWebGlCameraController.js");
const IgeWebGlRenderBatchManager_1 = require("../webgl/IgeWebGlRenderBatchManager.js");
const IgeWebGlStateManager_1 = require("../webgl/IgeWebGlStateManager.js");
const shaderLibrary_1 = require("../shaders/webgl/shaderLibrary.js");
const IgePoint3d_1 = require("./IgePoint3d.js");
/**
 * Custom WebGL renderer for IGE supporting full 3D rendering.
 * This renderer replaces the experimental three.js integration with
 * a purpose-built WebGL system for maximum control and performance.
 */
class IgeWebGlRenderer extends IgeBaseRenderer_1.IgeBaseRenderer {
    constructor() {
        super(...arguments);
        this.classId = "IgeWebGlRenderer";
        this._webglVersion = 2;
        this._contextLost = false;
        // WebGL capabilities and extensions
        this._capabilities = {
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
        /**
         * Handle canvas resize events.
         */
        this._resizeEvent = (event) => {
            if (!this._canvasElement || !this._autoSize)
                return;
            // Get the window dimensions
            let newWidth = window.innerWidth;
            let newHeight = window.innerHeight;
            // Update bounds
            this._bounds2d = new IgePoint2d_1.IgePoint2d(newWidth, newHeight);
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
        this._handleContextLost = (event) => {
            event.preventDefault();
            this._contextLost = true;
            this.log("WebGL context lost!", "warning");
        };
        /**
         * Handle WebGL context restoration.
         */
        this._handleContextRestored = () => {
            this._contextLost = false;
            this.log("WebGL context restored, reinitializing resources...");
            // Recreate all GPU resources
            // this._recreateResources();
        };
        /**
         * Toggle fullscreen mode.
         */
        this.toggleFullScreen = () => {
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
    }
    /**
     * Initialize the WebGL renderer.
     */
    _setup() {
        const _super = Object.create(null, {
            _setup: { get: () => super._setup }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super._setup.call(this);
            if (clientServer_1.isServer) {
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
            this._resourceManager = new IgeWebGlResourceManager_1.IgeWebGlResourceManager(this._canvasContext, this._webglVersion);
            this._shaderManager = new IgeWebGlShaderManager_1.IgeWebGlShaderManager(this._canvasContext, this._resourceManager);
            this._textureManager = new IgeWebGlTextureManager_1.IgeWebGlTextureManager(this._canvasContext, this._resourceManager);
            this._geometryManager = new IgeWebGlGeometryManager_1.IgeWebGlGeometryManager(this._canvasContext, this._resourceManager);
            this._renderBatchManager = new IgeWebGlRenderBatchManager_1.IgeWebGlRenderBatchManager(this._canvasContext);
            this._cameraController = new IgeWebGlCameraController_1.IgeWebGlCameraController();
            this._stateManager = new IgeWebGlStateManager_1.IgeWebGlStateManager(this._canvasContext);
            // Compile built-in shaders
            this._compileBuiltInShaders();
            this.isReady(true);
            this.log("WebGL renderer initialized successfully");
        });
    }
    /**
     * Creates a WebGL canvas front buffer.
     */
    createFrontBuffer(autoSize = true, dontScale = false) {
        if (!clientServer_1.isClient) {
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
        if (clientServer_1.isServer)
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
            preserveDrawingBuffer: false,
            premultipliedAlpha: true,
            powerPreference: "high-performance"
        };
        // Try WebGL2 first
        gl = this._canvasElement.getContext("webgl2", contextAttributes);
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
            this._devicePixelRatio = window.devicePixelRatio || 1;
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
        instance_1.ige.input.setupListeners(this._canvasElement);
        instance_1.ige.engine.headless(false);
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
        const shaderIds = shaderLibrary_1.IgeShaderLibrary.getAll();
        for (const shaderId of shaderIds) {
            const shaderSource = shaderLibrary_1.IgeShaderLibrary.get(shaderId);
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
     * Main scene graph rendering method.
     * Called once per frame by the engine.
     */
    renderSceneGraph(engine, viewports) {
        const gl = this._canvasContext;
        if (!gl || this._contextLost)
            return false;
        // Clear the entire canvas
        gl.viewport(0, 0, this._canvasElement.width, this._canvasElement.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Enable depth testing for 3D rendering
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // Render each viewport
        if (viewports && viewports.length > 0) {
            for (let i = 0; i < viewports.length; i++) {
                this._renderViewport(viewports[i]);
            }
        }
        return true;
    }
    /**
     * Render a single viewport.
     */
    _renderViewport(viewport) {
        var _a, _b;
        const gl = this._canvasContext;
        if (!gl || !this._renderBatchManager || !this._cameraController || !this._stateManager) {
            return;
        }
        // Get viewport dimensions in CSS pixels and convert to device pixels
        const dpr = this._devicePixelRatio;
        const vpX = Math.floor((((_a = viewport._translate) === null || _a === void 0 ? void 0 : _a.x) || 0) * dpr);
        const vpY = Math.floor((((_b = viewport._translate) === null || _b === void 0 ? void 0 : _b.y) || 0) * dpr);
        const vpWidth = Math.floor(viewport._bounds2d.x * dpr);
        const vpHeight = Math.floor(viewport._bounds2d.y * dpr);
        // Set viewport (using device pixels)
        this._stateManager.setViewport(vpX, vpY, vpWidth, vpHeight);
        // Enable scissor test for viewport clipping
        if (viewport._clipping) {
            this._stateManager.setScissorTest(true);
            this._stateManager.setScissorBox(vpX, vpY, vpWidth, vpHeight);
        }
        // Clear viewport area
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Get camera and update matrices
        const camera = viewport.camera;
        if (!camera) {
            return;
        }
        const matrices = this._cameraController.updateCamera(camera, viewport);
        // Start new frame for batch manager
        this._renderBatchManager.startFrame();
        // Traverse scene graph and build render batches
        const scene = viewport._scene;
        if (scene) {
            this._traverseSceneGraph(scene, camera, matrices.frustum);
        }
        // Prepare batches (sort transparent objects)
        const cameraPos = {
            x: camera._translate.x,
            y: camera._translate.y,
            z: camera._translate.z
        };
        this._renderBatchManager.prepareForRendering(cameraPos);
        // Render opaque objects first (front to back for early Z rejection)
        this._renderOpaqueBatches(matrices, viewport);
        // Render transparent objects (back to front for correct blending)
        this._renderTransparentBatches(matrices, viewport);
        // Disable scissor test
        if (viewport._clipping) {
            this._stateManager.setScissorTest(false);
        }
    }
    /**
     * Traverse the scene graph and add entities to render batches.
     */
    _traverseSceneGraph(entity, camera, frustum) {
        if (!entity || !this._renderBatchManager) {
            return;
        }
        // Update entity transform to ensure matrices are current
        if ('updateTransform' in entity && typeof entity.updateTransform === 'function') {
            entity.updateTransform();
        }
        // Check if entity is visible
        if (entity._hidden || !entity._inView) {
            return;
        }
        // Frustum culling (if entity has bounds)
        if (entity._bounds3d && entity._bounds3d.x > 0) {
            // Calculate bounding sphere center and radius
            const center = new IgePoint3d_1.IgePoint3d(entity._translate.x, entity._translate.y, entity._translate.z);
            const radius = Math.max(entity._bounds3d.x, entity._bounds3d.y, entity._bounds3d.z) / 2;
            if (!frustum.containsSphere(center, radius)) {
                entity._inView = false;
                return; // Skip this entity and its children
            }
        }
        entity._inView = true;
        // Add renderable entities to batches
        if (this._isRenderableEntity(entity)) {
            this._addEntityToBatch(entity);
        }
        // Recursively traverse children
        if (entity._children && entity._children.length > 0) {
            for (let i = 0; i < entity._children.length; i++) {
                this._traverseSceneGraph(entity._children[i], camera, frustum);
            }
        }
    }
    /**
     * Check if an entity is renderable (has texture or geometry with actual vertex data).
     */
    _isRenderableEntity(entity) {
        var _a;
        const hasTexture = !!entity._texture;
        const hasGeometryWithData = !!((_a = entity._geometryData) === null || _a === void 0 ? void 0 : _a.vertices);
        return hasTexture || hasGeometryWithData;
    }
    /**
     * Add an entity to the appropriate render batch.
     */
    _addEntityToBatch(entity) {
        if (!this._renderBatchManager || !this._geometryManager) {
            return;
        }
        // Determine if entity is transparent
        const isTransparent = entity._opacity < 1.0 || (entity._texture && entity._texture._hasAlpha);
        // Check if entity has a texture (2D sprite)
        if (entity._texture) {
            this._renderBatchManager.addSprite(entity, entity._texture, isTransparent);
            return;
        }
        // Check if entity has 3D geometry
        if (entity._geometryData) {
            const geometryId = entity._geometryData.id || "unknown";
            let geometry = this._geometryManager.getGeometry(geometryId);
            // Create geometry if it doesn't exist
            if (!geometry) {
                geometry = this._geometryManager.createGeometryFromData(geometryId, entity._geometryData) || undefined;
            }
            if (geometry) {
                const texture = entity._texture;
                const textureId = texture ? texture.id() : undefined;
                this._renderBatchManager.addModel(entity, geometry, textureId, isTransparent);
            }
        }
    }
    /**
     * Render all opaque batches.
     */
    _renderOpaqueBatches(matrices, viewport) {
        if (!this._renderBatchManager || !this._shaderManager || !this._geometryManager || !this._textureManager || !this._stateManager) {
            return;
        }
        const gl = this._canvasContext;
        // Enable depth test and depth write for opaque objects
        this._stateManager.setDepthTest(true);
        this._stateManager.setDepthWrite(true);
        this._stateManager.setDepthFunc(gl.LEQUAL);
        // Enable blending
        this._stateManager.setBlend(true);
        this._stateManager.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // Render opaque sprites
        this._renderSpriteBatches(matrices, false);
        // Render opaque models
        this._renderModelBatches(matrices, false);
    }
    /**
     * Render all transparent batches.
     */
    _renderTransparentBatches(matrices, viewport) {
        if (!this._renderBatchManager || !this._shaderManager || !this._stateManager) {
            return;
        }
        const gl = this._canvasContext;
        // Disable depth write but keep depth test for transparent objects
        this._stateManager.setDepthTest(true);
        this._stateManager.setDepthWrite(false);
        // Render transparent sprites
        this._renderSpriteBatches(matrices, true);
        // Render transparent models
        this._renderModelBatches(matrices, true);
        // Re-enable depth write
        this._stateManager.setDepthWrite(true);
    }
    /**
     * Render sprite batches.
     */
    _renderSpriteBatches(matrices, transparent) {
        if (!this._renderBatchManager || !this._shaderManager || !this._geometryManager || !this._textureManager || !this._stateManager) {
            return;
        }
        const gl = this._canvasContext;
        const spriteProgram = this._shaderManager.getProgram("sprite");
        const quadGeometry = this._geometryManager.getSharedQuadGeometry();
        if (!spriteProgram || !quadGeometry) {
            return;
        }
        // Use sprite shader
        spriteProgram.use();
        // Set view and projection matrices (same for all sprites)
        spriteProgram.setUniformMatrix4fv("u_viewMatrix", matrices.view);
        spriteProgram.setUniformMatrix4fv("u_projectionMatrix", matrices.projection);
        // Bind quad geometry
        this._geometryManager.bindGeometry(quadGeometry, spriteProgram);
        // Render function for each batch
        const renderBatch = (batch) => {
            // Bind texture
            const webglTexture = this._textureManager.getTextureForIgeTexture(batch.texture);
            if (webglTexture) {
                this._stateManager.bindTexture(webglTexture, 0);
                spriteProgram.setUniform1i("u_texture", 0);
            }
            // Render each entity in the batch
            for (const entity of batch.entities) {
                // Set entity-specific uniforms
                if (entity._worldMatrix4) {
                    spriteProgram.setUniformMatrix4fv("u_worldMatrix", entity._worldMatrix4);
                }
                spriteProgram.setUniform2f("u_scale", entity._bounds2d.x, entity._bounds2d.y);
                spriteProgram.setUniform4f("u_uvBounds", 0, 0, 1, 1); // Full texture for now
                spriteProgram.setUniform4f("u_tint", 1, 1, 1, 1); // White tint
                spriteProgram.setUniform1f("u_opacity", entity._opacity);
                spriteProgram.setUniform1i("u_billboardMode", 1); // Full billboarding for 2D sprites
                // Draw quad
                this._geometryManager.drawGeometry(quadGeometry);
            }
        };
        // Render appropriate batches
        if (transparent) {
            this._renderBatchManager.renderTransparentSprites(spriteProgram, quadGeometry, renderBatch);
        }
        else {
            this._renderBatchManager.renderOpaqueSprites(spriteProgram, quadGeometry, renderBatch);
        }
        // Unbind geometry
        this._geometryManager.unbindGeometry(quadGeometry, spriteProgram);
    }
    /**
     * Render model batches.
     */
    _renderModelBatches(matrices, transparent) {
        if (!this._renderBatchManager || !this._shaderManager || !this._geometryManager || !this._textureManager || !this._stateManager) {
            return;
        }
        const gl = this._canvasContext;
        const modelProgram = this._shaderManager.getProgram("model");
        if (!modelProgram) {
            return;
        }
        // Use model shader
        modelProgram.use();
        // Set view and projection matrices
        modelProgram.setUniformMatrix4fv("u_viewMatrix", matrices.view);
        modelProgram.setUniformMatrix4fv("u_projectionMatrix", matrices.projection);
        // Set default uniforms
        modelProgram.setUniform4f("u_baseColor", 1, 1, 1, 1);
        modelProgram.setUniform3f("u_ambientLight", 0.3, 0.3, 0.3);
        // Render function for each batch
        const renderBatch = (batch) => {
            // Bind geometry
            this._geometryManager.bindGeometry(batch.geometry, modelProgram);
            // Bind texture if available
            if (batch.textureId) {
                // TODO: Get texture and bind
            }
            // Render each entity in the batch
            for (const entity of batch.entities) {
                // Set entity-specific uniforms
                if (entity._worldMatrix4) {
                    modelProgram.setUniformMatrix4fv("u_worldMatrix", entity._worldMatrix4);
                    // Calculate normal matrix (inverse transpose of world matrix)
                    const normalMatrix = entity._worldMatrix4.getInverse();
                    if (normalMatrix) {
                        modelProgram.setUniformMatrix4fv("u_normalMatrix", normalMatrix);
                    }
                }
                modelProgram.setUniform1f("u_opacity", entity._opacity);
                // Draw geometry
                this._geometryManager.drawGeometry(batch.geometry);
            }
            // Unbind geometry
            this._geometryManager.unbindGeometry(batch.geometry, modelProgram);
        };
        // Render appropriate batches
        if (transparent) {
            this._renderBatchManager.renderTransparentModels(modelProgram, renderBatch);
        }
        else {
            this._renderBatchManager.renderOpaqueModels(modelProgram, renderBatch);
        }
    }
    /**
     * Clean up and destroy the renderer.
     */
    destroy() {
        var _a, _b, _c, _d, _e, _f;
        if (this._canvasElement) {
            // Remove event listeners
            this._canvasElement.removeEventListener("webglcontextlost", this._handleContextLost);
            this._canvasElement.removeEventListener("webglcontextrestored", this._handleContextRestored);
        }
        // Clean up managers
        (_a = this._geometryManager) === null || _a === void 0 ? void 0 : _a.cleanup();
        (_b = this._shaderManager) === null || _b === void 0 ? void 0 : _b.deleteAllPrograms();
        (_c = this._textureManager) === null || _c === void 0 ? void 0 : _c.clearState();
        (_d = this._cameraController) === null || _d === void 0 ? void 0 : _d.clearCache();
        (_e = this._resourceManager) === null || _e === void 0 ? void 0 : _e.cleanup();
        // Lose WebGL context
        const loseContext = (_f = this._canvasContext) === null || _f === void 0 ? void 0 : _f.getExtension("WEBGL_lose_context");
        if (loseContext) {
            loseContext.loseContext();
        }
        // Remove canvas
        if (this._createdFrontBuffer && this._canvasElement) {
            instance_1.ige.input.destroyListeners(this._canvasElement);
            document.body.removeChild(this._canvasElement);
        }
        this._canvasContext = null;
        delete this._canvasElement;
        instance_1.ige.engine.headless(true);
        super.destroy();
    }
}
exports.IgeWebGlRenderer = IgeWebGlRenderer;
