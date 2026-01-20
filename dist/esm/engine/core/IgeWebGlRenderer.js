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
    // Shadow-casting directional light reference
    _shadowCastingLight;
    _shadowLightId = "mainDirectionalLight";
    // Shadow debug mode (0 = off, 1-4 = different visualizations)
    _shadowDebugMode = 0;
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
        // Get viewport dimensions in CSS pixels and convert to device pixels
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
        // Get shadow shader
        const shadowProgram = this._shaderManager.getProgram("shadow");
        if (!shadowProgram) {
            this._shadowManager.endShadowPass();
            return;
        }
        // Use shadow shader
        shadowProgram.use();
        // Set light space matrix
        shadowProgram.setUniformMatrix4fv("u_lightSpaceMatrix", lightSpaceMatrix);
        // Render all opaque models to shadow map
        const renderBatchShadow = (batch) => {
            this._geometryManager.bindGeometry(batch.geometry, shadowProgram);
            for (const entity of batch.entities) {
                if (entity._worldMatrix4) {
                    shadowProgram.setUniformMatrix4fv("u_worldMatrix", entity._worldMatrix4.matrix);
                }
                this._geometryManager.drawGeometry(batch.geometry);
            }
            this._geometryManager.unbindGeometry(batch.geometry, shadowProgram);
        };
        // Only render opaque models to shadow map (shadows from opaque geometry only)
        this._renderBatchManager.renderOpaqueModels(shadowProgram, renderBatchShadow);
        // End shadow pass (restores default framebuffer)
        this._shadowManager.endShadowPass();
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
     */
    _renderModelBatches(matrices, transparent) {
        if (!this._renderBatchManager || !this._shaderManager || !this._geometryManager || !this._textureManager || !this._stateManager) {
            return;
        }
        const gl = this._canvasContext;
        // Try to use lit shader for full lighting, fall back to model shader
        let shaderProgram = this._shaderManager.getProgram("lit");
        const useLitShader = shaderProgram !== undefined;
        if (!shaderProgram) {
            shaderProgram = this._shaderManager.getProgram("model");
        }
        if (!shaderProgram) {
            return;
        }
        // Use shader
        shaderProgram.use();
        // Set view and projection matrices
        shaderProgram.setUniformMatrix4fv("u_viewMatrix", matrices.view);
        shaderProgram.setUniformMatrix4fv("u_projectionMatrix", matrices.projection);
        if (useLitShader) {
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
                // Set light space matrix for vertex shader
                const lightSpaceMatrix = this._shadowManager.getLightSpaceMatrix(this._shadowLightId);
                if (lightSpaceMatrix) {
                    shaderProgram.setUniformMatrix4fv("u_lightSpaceMatrix", lightSpaceMatrix);
                }
                // Set shadow debug mode
                shaderProgram.setUniform1i("u_shadowDebug", this._shadowDebugMode);
            }
            else {
                // Disable shadows in shader
                shaderProgram.setUniform1i("u_hasShadowMap", 0);
                shaderProgram.setUniform1i("u_shadowDebug", 0);
                // Set identity matrix for light space when shadows disabled
                shaderProgram.setUniformMatrix4fv("u_lightSpaceMatrix", new Float32Array([
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1
                ]));
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
        // Render function for each batch
        const renderBatch = (batch) => {
            // Bind geometry
            this._geometryManager.bindGeometry(batch.geometry, shaderProgram);
            // Bind texture if available, otherwise use default white texture
            // Use state manager to properly track texture bindings
            if (batch.textureId && batch.texture) {
                const webGlTexture = this._textureManager.getTextureForIgeTexture(batch.texture);
                if (webGlTexture) {
                    this._stateManager.bindTexture(webGlTexture, 0);
                }
                else {
                    // Fallback to default white texture
                    this._stateManager.bindTexture(this._textureManager.getDefaultWhiteTexture(), 0);
                }
            }
            else {
                // No texture - use default white texture so base color shows correctly
                this._stateManager.bindTexture(this._textureManager.getDefaultWhiteTexture(), 0);
            }
            shaderProgram.setUniform1i("u_baseColorTexture", 0);
            // Render each entity in the batch
            for (const entity of batch.entities) {
                // Set entity-specific uniforms
                if (entity._worldMatrix4) {
                    shaderProgram.setUniformMatrix4fv("u_worldMatrix", entity._worldMatrix4);
                    // Calculate normal matrix (inverse transpose of world matrix)
                    const normalMatrix = entity._worldMatrix4.getInverse();
                    if (normalMatrix) {
                        shaderProgram.setUniformMatrix4fv("u_normalMatrix", normalMatrix);
                    }
                }
                shaderProgram.setUniform1f("u_opacity", entity._opacity);
                // Apply material if entity has one and using lit shader
                if (useLitShader && entity._materialData) {
                    const mat = entity._materialData;
                    if (mat.color) {
                        // Handle color as object {r,g,b,a} or CSS string
                        if (typeof mat.color === "object") {
                            shaderProgram.setUniform4f("u_baseColor", mat.color.r, mat.color.g, mat.color.b, mat.color.a ?? 1);
                        }
                        else if (typeof mat.color === "string") {
                            // Parse CSS color string (basic hex support)
                            const hex = mat.color.replace("#", "");
                            const r = parseInt(hex.substring(0, 2), 16) / 255;
                            const g = parseInt(hex.substring(2, 4), 16) / 255;
                            const b = parseInt(hex.substring(4, 6), 16) / 255;
                            shaderProgram.setUniform4f("u_baseColor", r, g, b, 1);
                        }
                    }
                    if (mat.metallic !== undefined || mat.roughness !== undefined) {
                        // Keep PBR disabled for now - simple lighting shows colors better
                        // shaderProgram!.setUniform1i("u_usePBR", 1);
                        shaderProgram.setUniform1f("u_metallic", mat.metallic ?? 0);
                        shaderProgram.setUniform1f("u_roughness", mat.roughness ?? 0.5);
                    }
                    if (mat.emissiveColor) {
                        shaderProgram.setUniform3f("u_emissiveColor", mat.emissiveColor.r, mat.emissiveColor.g, mat.emissiveColor.b);
                        shaderProgram.setUniform1f("u_emissiveIntensity", mat.emissiveIntensity ?? 1);
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
            this._renderBatchManager.renderTransparentModels(shaderProgram, renderBatch);
        }
        else {
            this._renderBatchManager.renderOpaqueModels(shaderProgram, renderBatch);
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
            normalBias: 0.02
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
