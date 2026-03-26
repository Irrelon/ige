import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import { IgePoint2d } from "./IgePoint2d.js"
import { ige } from "../instance.js"
import { isClient, isServer } from "../utils/clientServer.js"
import { IgeWebGlResourceManager } from "../webgl/IgeWebGlResourceManager.js"
import { IgeWebGlShaderManager } from "../webgl/IgeWebGlShaderManager.js"
import { IgeWebGlTextureManager } from "../webgl/IgeWebGlTextureManager.js"
import { IgeWebGlGeometryManager } from "../webgl/IgeWebGlGeometryManager.js"
import { IgeWebGlCameraController } from "../webgl/IgeWebGlCameraController.js"
import { IgeWebGlRenderBatchManager } from "../webgl/IgeWebGlRenderBatchManager.js"
import { IgeWebGlStateManager } from "../webgl/IgeWebGlStateManager.js"
import { IgeWebGlLightManager } from "../webgl/IgeWebGlLightManager.js"
import { IgeWebGlShadowManager } from "../webgl/IgeWebGlShadowManager.js"
import { IgeWebGlSkeletonManager } from "../webgl/IgeWebGlSkeletonManager.js"
import { IgeShaderLibrary } from "../shaders/webgl/shaderLibrary.js"
import { IgePoint3d } from "./IgePoint3d.js"
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
    _renderBatchManager;
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
    // When true, the WebGL drawing buffer is preserved after compositing,
    // allowing gl.readPixels() to work after a frame is rendered.
    // Must be set before createFrontBuffer() is called.
    _preserveDrawingBuffer = false;
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
        this._renderBatchManager = new IgeWebGlRenderBatchManager(this._canvasContext);
        this._cameraController = new IgeWebGlCameraController();
        this._stateManager = new IgeWebGlStateManager(this._canvasContext);
        this._lightManager = new IgeWebGlLightManager();
        this._shadowManager = new IgeWebGlShadowManager(this._canvasContext, this._resourceManager, this._webglVersion);
        this._skeletonManager = new IgeWebGlSkeletonManager();
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
        const gl = this._canvasContext;
        if (!gl || !this._renderBatchManager || !this._cameraController || !this._stateManager) {
            return;
        }
        // Get viewport dimensions in CSS pixels and convert to device pixels.
        const dpr = this._devicePixelRatio;
        const vpX = Math.floor((viewport._translate?.x || 0) * dpr);
        const vpY = Math.floor((viewport._translate?.y || 0) * dpr);
        const vpWidth = Math.floor(viewport._bounds2d.x * dpr);
        const vpHeight = Math.floor(viewport._bounds2d.y * dpr);
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
        // ============================================================
        // SHADOW PASS: Render scene from light's perspective
        // ============================================================
        if (this.shadowsEnabled() && this._shadowManager && this._shadowCastingLight) {
            this._renderShadowPass(matrices, cameraPos);
            // Reset state manager after shadow pass - the shadow pass changes GL state
            // directly (framebuffer, viewport, depth func, cull face) which puts the
            // state manager's cached state out of sync with actual GL state
            this._stateManager.reset();
            // Restore depth function to LEQUAL (shadow pass uses LESS)
            gl.depthFunc(gl.LEQUAL);
        }
        // ============================================================
        // POINT LIGHT SHADOW PASS: Render 6 faces per point light
        // ============================================================
        if (this._shadowCastingPointLights.length > 0 && this._shadowManager) {
            this._renderPointLightShadowPasses();
            this._stateManager.reset();
            gl.depthFunc(gl.LEQUAL);
        }
        // ============================================================
        // MAIN RENDER PASS
        // ============================================================
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
     * Render shadow pass - renders scene from light's perspective to shadow map.
     */
    _renderShadowPass(matrices, cameraPos) {
        if (!this._shadowManager || !this._shadowCastingLight || !this._shaderManager || !this._geometryManager || !this._renderBatchManager) {
            return;
        }
        const gl = this._canvasContext;
        // Update light space matrix
        const lightSpaceMatrix = this._shadowManager.updateLightSpaceMatrix(this._shadowLightId, this._shadowCastingLight, cameraPos);
        if (!lightSpaceMatrix) {
            return;
        }
        // Begin shadow pass (binds framebuffer, sets viewport, clears depth)
        if (!this._shadowManager.beginShadowPass(this._shadowLightId)) {
            return;
        }
        // Get shadow shaders (regular and skinned)
        const shadowProgram = this._shaderManager.getProgram("shadow");
        const skinnedShadowProgram = this._shaderManager.getProgram("skinned_shadow");
        if (!shadowProgram) {
            this._shadowManager.endShadowPass();
            return;
        }
        // Setup a shadow program with the light space matrix
        let currentShadowProgram = null;
        const setupShadowProgram = (program) => {
            program.use();
            program.setUniformMatrix4fv("u_lightSpaceMatrix", lightSpaceMatrix);
            currentShadowProgram = program;
        };
        setupShadowProgram(shadowProgram);
        // Render all opaque models to shadow map
        const renderBatchShadow = (batch) => {
            const isSkinned = batch.geometry.isSkinned && skinnedShadowProgram;
            const program = isSkinned ? skinnedShadowProgram : shadowProgram;
            if (program !== currentShadowProgram) {
                setupShadowProgram(program);
                if (isSkinned) {
                    program.setUniform1i("u_useSkinning", 0);
                }
            }
            this._geometryManager.bindGeometry(batch.geometry, program);
            for (const entity of batch.entities) {
                if (entity._noShadowCast)
                    continue;
                if (entity._worldMatrix4) {
                    program.setUniformMatrix4fv("u_worldMatrix", entity._worldMatrix4);
                }
                // Handle skeletal animation for skinned shadow
                if (isSkinned && entity._skeleton && this._skeletonManager) {
                    this._skeletonManager.updateSkeletonMatrices(entity._skeleton);
                    program.setUniform1i("u_useSkinning", 1);
                    const skinMatrices = entity._skeleton.skinMatrices;
                    const boneCount = entity._skeleton.data.boneCount;
                    const location = gl.getUniformLocation(program.program, "u_boneMatrices[0]");
                    if (location) {
                        gl.uniformMatrix4fv(location, false, skinMatrices.subarray(0, boneCount * 16));
                    }
                }
                else if (isSkinned) {
                    program.setUniform1i("u_useSkinning", 0);
                }
                this._geometryManager.drawGeometry(batch.geometry);
            }
            this._geometryManager.unbindGeometry(batch.geometry, program);
        };
        // Only render opaque models to shadow map (shadows from opaque geometry only)
        this._renderBatchManager.renderOpaqueModels(shadowProgram, renderBatchShadow);
        // End shadow pass (restores default framebuffer)
        this._shadowManager.endShadowPass();
    }
    /**
     * Render point light shadow passes (6 faces per shadow-casting point light).
     */
    _renderPointLightShadowPasses() {
        if (!this._shadowManager || !this._shaderManager || !this._geometryManager || !this._renderBatchManager) {
            return;
        }
        const gl = this._canvasContext;
        const pointShadowProgram = this._shaderManager.getProgram("point_shadow");
        const skinnedPointShadowProgram = this._shaderManager.getProgram("skinned_point_shadow");
        if (!pointShadowProgram)
            return;
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
            // Render 6 cube faces
            for (let face = 0; face < 6; face++) {
                if (!this._shadowManager.beginPointShadowPass(lightId, face)) {
                    continue;
                }
                const lightSpaceMatrix = this._shadowManager.getPointLightSpaceMatrix(lightId, face);
                if (!lightSpaceMatrix) {
                    this._shadowManager.endPointShadowPass();
                    continue;
                }
                // Track current program to minimize switches
                let currentProgram = null;
                // Setup shared uniforms on a program
                const setupProgram = (program) => {
                    program.use();
                    program.setUniformMatrix4fv("u_lightSpaceMatrix", lightSpaceMatrix);
                    program.setUniform3f("u_pointLightPosition", pos.x, pos.y, pos.z);
                    program.setUniform1f("u_pointShadowFarPlane", farPlane);
                    currentProgram = program;
                };
                // Render all opaque models
                const renderBatch = (batch) => {
                    const isSkinned = batch.geometry.isSkinned && skinnedPointShadowProgram;
                    const program = isSkinned ? skinnedPointShadowProgram : pointShadowProgram;
                    // Switch shader if needed
                    if (program !== currentProgram) {
                        setupProgram(program);
                        if (isSkinned) {
                            program.setUniform1i("u_useSkinning", 0);
                        }
                    }
                    this._geometryManager.bindGeometry(batch.geometry, program);
                    for (const entity of batch.entities) {
                        if (entity._noShadowCast)
                            continue;
                        if (entity._worldMatrix4) {
                            program.setUniformMatrix4fv("u_worldMatrix", entity._worldMatrix4);
                        }
                        // Handle skeletal animation
                        if (isSkinned && entity._skeleton && this._skeletonManager) {
                            this._skeletonManager.updateSkeletonMatrices(entity._skeleton);
                            program.setUniform1i("u_useSkinning", 1);
                            const skinMatrices = entity._skeleton.skinMatrices;
                            const boneCount = entity._skeleton.data.boneCount;
                            const location = gl.getUniformLocation(program.program, "u_boneMatrices[0]");
                            if (location) {
                                gl.uniformMatrix4fv(location, false, skinMatrices.subarray(0, boneCount * 16));
                            }
                        }
                        else if (isSkinned) {
                            program.setUniform1i("u_useSkinning", 0);
                        }
                        this._geometryManager.drawGeometry(batch.geometry);
                    }
                    this._geometryManager.unbindGeometry(batch.geometry, program);
                };
                // Use pointShadowProgram as the default for renderOpaqueModels
                // (it needs a program reference but renderBatch handles program selection)
                setupProgram(pointShadowProgram);
                this._renderBatchManager.renderOpaqueModels(pointShadowProgram, renderBatch);
                this._shadowManager.endPointShadowPass();
            }
            // No blur pass needed - using Vogel disk PCF for soft shadows
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
            const center = new IgePoint3d(entity._translate.x, entity._translate.y, entity._translate.z);
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
        const hasTexture = !!entity._texture;
        const hasGeometryWithData = !!entity._geometryData?.vertices;
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
     * Render model batches using lit shader with full lighting support.
     * Falls back to simple model shader if lit shader is not available.
     * Supports skinned meshes with skeletal animation.
     */
    _renderModelBatches(matrices, transparent) {
        if (!this._renderBatchManager || !this._shaderManager || !this._geometryManager || !this._textureManager || !this._stateManager) {
            return;
        }
        const gl = this._canvasContext;
        // Get both regular and skinned shaders
        const litProgram = this._shaderManager.getProgram("lit");
        const skinnedProgram = this._shaderManager.getProgram("skinned");
        const modelProgram = this._shaderManager.getProgram("model");
        // Determine which shaders are available
        const useLitShader = litProgram !== undefined;
        const useSkinnedShader = skinnedProgram !== undefined;
        // Select default non-skinned shader
        let defaultShaderProgram = litProgram || modelProgram;
        if (!defaultShaderProgram) {
            return;
        }
        // Identity matrix for when skinning is disabled
        const identityMatrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
        // Helper to set up common uniforms for a shader
        const setupShaderUniforms = (shaderProgram, useLit) => {
            // Set view and projection matrices
            shaderProgram.setUniformMatrix4fv("u_viewMatrix", matrices.view);
            shaderProgram.setUniformMatrix4fv("u_projectionMatrix", matrices.projection);
            if (useLit) {
                // Set camera position for specular calculations
                if (matrices.cameraPosition) {
                    shaderProgram.setUniform3f("u_cameraPosition", matrices.cameraPosition.x, matrices.cameraPosition.y, matrices.cameraPosition.z);
                }
                // Apply light uniforms
                if (this._lightManager) {
                    this._lightManager.applyLightUniforms(shaderProgram);
                }
                // Apply shadow uniforms if shadows are enabled
                if (this.shadowsEnabled() && this._shadowManager) {
                    this._shadowManager.applyShadowUniforms(shaderProgram, this._shadowLightId, 1);
                    const lightSpaceMatrix = this._shadowManager.getLightSpaceMatrix(this._shadowLightId);
                    if (lightSpaceMatrix) {
                        shaderProgram.setUniformMatrix4fv("u_lightSpaceMatrix", lightSpaceMatrix);
                    }
                    shaderProgram.setUniform1i("u_shadowDebug", this._shadowDebugMode);
                    // Normal offset: shift shadow lookup along surface normal (prevents acne without contact gaps)
                    shaderProgram.setUniform1f("u_shadowNormalOffset", 0.0);
                }
                else {
                    shaderProgram.setUniform1i("u_hasShadowMap", 0);
                    shaderProgram.setUniform1i("u_shadowDebug", 0);
                    shaderProgram.setUniformMatrix4fv("u_lightSpaceMatrix", identityMatrix);
                    shaderProgram.setUniform1f("u_shadowNormalOffset", 0.0);
                }
                // Apply point light shadow uniforms
                if (this._shadowCastingPointLights.length > 0 && this._shadowManager && this._lightManager) {
                    const count = Math.min(this._shadowCastingPointLights.length, 2);
                    shaderProgram.setUniform1i("u_numShadowPointLights", count);
                    for (let i = 0; i < count; i++) {
                        const light = this._shadowCastingPointLights[i];
                        const texUnit = 2 + i;
                        this._shadowManager.applyPointShadowUniforms(shaderProgram, i, light.id(), texUnit);
                        const pointLightIndex = this._lightManager._pointLights.indexOf(light);
                        shaderProgram.setUniform1i(`u_pointShadowLightIndex[${i}]`, pointLightIndex);
                    }
                }
                else {
                    shaderProgram.setUniform1i("u_numShadowPointLights", 0);
                }
                // Default to simple lighting mode (non-PBR)
                shaderProgram.setUniform1i("u_usePBR", 0);
                shaderProgram.setUniform1i("u_hasNormalMap", 0);
                shaderProgram.setUniform1f("u_emissiveIntensity", 0);
            }
            else {
                // Fallback: simple ambient light for model shader
                shaderProgram.setUniform3f("u_ambientLight", 0.3, 0.3, 0.3);
            }
            // Set default base color
            shaderProgram.setUniform4f("u_baseColor", 1, 1, 1, 1);
        };
        // Track current shader to minimize state changes
        let currentProgram = null;
        // Render function for each batch
        const renderBatch = (batch) => {
            // Check if this batch has skinned geometry
            const isSkinned = batch.geometry.isSkinned && useSkinnedShader;
            // Select appropriate shader
            const shaderProgram = isSkinned ? skinnedProgram : defaultShaderProgram;
            // Switch shader if needed
            if (shaderProgram !== currentProgram) {
                shaderProgram.use();
                setupShaderUniforms(shaderProgram, useLitShader || isSkinned);
                currentProgram = shaderProgram;
                // For skinned shader, disable skinning by default (will enable per-entity)
                if (isSkinned) {
                    shaderProgram.setUniform1i("u_useSkinning", 0);
                }
            }
            // Bind geometry
            this._geometryManager.bindGeometry(batch.geometry, shaderProgram);
            // Bind texture if available, otherwise use default white texture
            if (batch.textureId && batch.texture) {
                const webGlTexture = this._textureManager.getTextureForIgeTexture(batch.texture);
                if (webGlTexture) {
                    this._stateManager.bindTexture(webGlTexture, 0);
                }
                else {
                    this._stateManager.bindTexture(this._textureManager.getDefaultWhiteTexture(), 0);
                }
            }
            else {
                this._stateManager.bindTexture(this._textureManager.getDefaultWhiteTexture(), 0);
            }
            shaderProgram.setUniform1i("u_baseColorTexture", 0);
            // Render each entity in the batch
            for (const entity of batch.entities) {
                // Set entity-specific uniforms
                if (entity._worldMatrix4) {
                    shaderProgram.setUniformMatrix4fv("u_worldMatrix", entity._worldMatrix4);
                    // Calculate normal matrix (inverse transpose of world matrix)
                    const inverseMatrix = entity._worldMatrix4.getInverse();
                    if (inverseMatrix) {
                        const normalMatrix = inverseMatrix.transpose();
                        shaderProgram.setUniformMatrix4fv("u_normalMatrix", normalMatrix);
                    }
                }
                shaderProgram.setUniform1f("u_opacity", entity._opacity);
                // Handle skeletal animation for skinned meshes
                if (isSkinned && entity._skeleton && this._skeletonManager) {
                    // Update skeleton matrices
                    this._skeletonManager.updateSkeletonMatrices(entity._skeleton);
                    // Enable skinning and upload bone matrices
                    shaderProgram.setUniform1i("u_useSkinning", 1);
                    // Upload bone matrices array
                    const skinMatrices = entity._skeleton.skinMatrices;
                    const boneCount = entity._skeleton.data.boneCount;
                    // Set each bone matrix as a uniform
                    // Note: WebGL 1 doesn't support uniform arrays directly in all cases,
                    // so we set the entire array at once
                    const location = gl.getUniformLocation(shaderProgram.program, "u_boneMatrices[0]");
                    if (location) {
                        gl.uniformMatrix4fv(location, false, skinMatrices.subarray(0, boneCount * 16));
                    }
                }
                else if (isSkinned) {
                    // Skinned geometry but no skeleton - disable skinning
                    shaderProgram.setUniform1i("u_useSkinning", 0);
                }
                // Reset per-entity material state to prevent leaking from previous entity
                if (useLitShader || isSkinned) {
                    shaderProgram.setUniform1f("u_emissiveIntensity", 0);
                    shaderProgram.setUniform1f("u_metallic", 0);
                    shaderProgram.setUniform1f("u_roughness", 0.5);
                }
                // Apply material if entity has one and using lit-style shader
                if ((useLitShader || isSkinned) && entity._materialData) {
                    const mat = entity._materialData;
                    if (mat.color) {
                        if (typeof mat.color === "object") {
                            shaderProgram.setUniform4f("u_baseColor", mat.color.r, mat.color.g, mat.color.b, mat.color.a ?? 1);
                        }
                        else if (typeof mat.color === "string") {
                            const hex = mat.color.replace("#", "");
                            const r = parseInt(hex.substring(0, 2), 16) / 255;
                            const g = parseInt(hex.substring(2, 4), 16) / 255;
                            const b = parseInt(hex.substring(4, 6), 16) / 255;
                            shaderProgram.setUniform4f("u_baseColor", r, g, b, 1);
                        }
                    }
                    if (mat.metallic !== undefined || mat.roughness !== undefined) {
                        shaderProgram.setUniform1f("u_metallic", mat.metallic ?? 0);
                        shaderProgram.setUniform1f("u_roughness", mat.roughness ?? 0.5);
                    }
                    if (mat.emissiveColor) {
                        shaderProgram.setUniform3f("u_emissiveColor", mat.emissiveColor.r, mat.emissiveColor.g, mat.emissiveColor.b);
                        shaderProgram.setUniform1f("u_emissiveIntensity", mat.emissiveIntensity ?? 1);
                    }
                    // Bind entity material texture if available (e.g., from GLTF)
                    if (mat.textureId && this._textureManager) {
                        const blobTexture = this._textureManager.getBlobTexture(mat.textureId);
                        if (blobTexture) {
                            // Force rebind to ensure texture is applied even if state manager thinks it's cached
                            this._stateManager.bindTexture(blobTexture, 0, true);
                        }
                    }
                }
                // Draw geometry
                this._geometryManager.drawGeometry(batch.geometry);
            }
            // Unbind geometry
            this._geometryManager.unbindGeometry(batch.geometry, shaderProgram);
        };
        // Render appropriate batches
        if (transparent) {
            this._renderBatchManager.renderTransparentModels(defaultShaderProgram, renderBatch);
        }
        else {
            this._renderBatchManager.renderOpaqueModels(defaultShaderProgram, renderBatch);
        }
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
