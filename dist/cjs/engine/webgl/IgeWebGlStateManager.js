"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeWebGlStateManager = void 0;
const IgeBaseClass_1 = require("../core/IgeBaseClass.js");
/**
 * Manages WebGL state to minimize redundant API calls.
 * Tracks currently bound resources and only updates when necessary.
 */
class IgeWebGlStateManager extends IgeBaseClass_1.IgeBaseClass {
    constructor(gl) {
        super();
        this.classId = "IgeWebGlStateManager";
        // Bound resource tracking
        this._boundProgram = null;
        this._boundVBO = null;
        this._boundIBO = null;
        this._boundVAO = null;
        this._boundFramebuffer = null;
        this._boundTextures = new Array(32).fill(null);
        this._activeTextureUnit = 0;
        // State tracking
        this._depthTestEnabled = true;
        this._depthWriteEnabled = true;
        this._blendEnabled = true;
        this._cullFaceEnabled = false;
        // Viewport tracking
        this._viewport = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        // Scissor test tracking
        this._scissorTestEnabled = false;
        this._scissorBox = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        this._gl = gl;
        // Initialize with current GL state
        this._depthFunc = gl.LEQUAL;
        this._blendSrc = gl.SRC_ALPHA;
        this._blendDst = gl.ONE_MINUS_SRC_ALPHA;
        this._cullFace = gl.BACK;
        this._frontFace = gl.CCW;
    }
    /**
     * Use a shader program (with state tracking).
     */
    useProgram(program) {
        if (this._boundProgram === program) {
            return;
        }
        this._gl.useProgram(program);
        this._boundProgram = program;
    }
    /**
     * Bind a vertex buffer (with state tracking).
     */
    bindBuffer(buffer) {
        if (this._boundVBO === buffer) {
            return;
        }
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer);
        this._boundVBO = buffer;
    }
    /**
     * Bind an index buffer (with state tracking).
     */
    bindIndexBuffer(buffer) {
        if (this._boundIBO === buffer) {
            return;
        }
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, buffer);
        this._boundIBO = buffer;
    }
    /**
     * Bind a vertex array object (with state tracking).
     */
    bindVAO(vao) {
        if (this._boundVAO === vao) {
            return;
        }
        const gl = this._gl;
        if ('bindVertexArray' in gl) {
            gl.bindVertexArray(vao);
        }
        else {
            const ext = gl.getExtension('OES_vertex_array_object');
            if (ext) {
                ext.bindVertexArrayOES(vao);
            }
        }
        this._boundVAO = vao;
        // When binding a new VAO, we need to clear buffer bindings as they're now part of the VAO
        this._boundVBO = null;
        this._boundIBO = null;
    }
    /**
     * Bind a framebuffer (with state tracking).
     */
    bindFramebuffer(framebuffer) {
        if (this._boundFramebuffer === framebuffer) {
            return;
        }
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, framebuffer);
        this._boundFramebuffer = framebuffer;
    }
    /**
     * Bind a texture to a specific unit (with state tracking).
     */
    bindTexture(texture, unit = 0) {
        // Check if texture is already bound to this unit
        if (this._boundTextures[unit] === texture && this._activeTextureUnit === unit) {
            return;
        }
        // Activate texture unit if different
        if (this._activeTextureUnit !== unit) {
            this._gl.activeTexture(this._gl.TEXTURE0 + unit);
            this._activeTextureUnit = unit;
        }
        // Bind texture
        this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
        this._boundTextures[unit] = texture;
    }
    /**
     * Enable/disable depth testing (with state tracking).
     */
    setDepthTest(enabled) {
        if (this._depthTestEnabled === enabled) {
            return;
        }
        if (enabled) {
            this._gl.enable(this._gl.DEPTH_TEST);
        }
        else {
            this._gl.disable(this._gl.DEPTH_TEST);
        }
        this._depthTestEnabled = enabled;
    }
    /**
     * Set depth write mask (with state tracking).
     */
    setDepthWrite(enabled) {
        if (this._depthWriteEnabled === enabled) {
            return;
        }
        this._gl.depthMask(enabled);
        this._depthWriteEnabled = enabled;
    }
    /**
     * Set depth function (with state tracking).
     */
    setDepthFunc(func) {
        if (this._depthFunc === func) {
            return;
        }
        this._gl.depthFunc(func);
        this._depthFunc = func;
    }
    /**
     * Enable/disable blending (with state tracking).
     */
    setBlend(enabled) {
        if (this._blendEnabled === enabled) {
            return;
        }
        if (enabled) {
            this._gl.enable(this._gl.BLEND);
        }
        else {
            this._gl.disable(this._gl.BLEND);
        }
        this._blendEnabled = enabled;
    }
    /**
     * Set blend function (with state tracking).
     */
    setBlendFunc(src, dst) {
        if (this._blendSrc === src && this._blendDst === dst) {
            return;
        }
        this._gl.blendFunc(src, dst);
        this._blendSrc = src;
        this._blendDst = dst;
    }
    /**
     * Enable/disable face culling (with state tracking).
     */
    setCullFace(enabled) {
        if (this._cullFaceEnabled === enabled) {
            return;
        }
        if (enabled) {
            this._gl.enable(this._gl.CULL_FACE);
        }
        else {
            this._gl.disable(this._gl.CULL_FACE);
        }
        this._cullFaceEnabled = enabled;
    }
    /**
     * Set which face to cull (with state tracking).
     */
    setCullFaceMode(mode) {
        if (this._cullFace === mode) {
            return;
        }
        this._gl.cullFace(mode);
        this._cullFace = mode;
    }
    /**
     * Set front face winding order (with state tracking).
     */
    setFrontFace(mode) {
        if (this._frontFace === mode) {
            return;
        }
        this._gl.frontFace(mode);
        this._frontFace = mode;
    }
    /**
     * Set viewport (with state tracking).
     */
    setViewport(x, y, width, height) {
        const vp = this._viewport;
        if (vp.x === x && vp.y === y && vp.width === width && vp.height === height) {
            return;
        }
        this._gl.viewport(x, y, width, height);
        vp.x = x;
        vp.y = y;
        vp.width = width;
        vp.height = height;
    }
    /**
     * Enable/disable scissor test (with state tracking).
     */
    setScissorTest(enabled) {
        if (this._scissorTestEnabled === enabled) {
            return;
        }
        if (enabled) {
            this._gl.enable(this._gl.SCISSOR_TEST);
        }
        else {
            this._gl.disable(this._gl.SCISSOR_TEST);
        }
        this._scissorTestEnabled = enabled;
    }
    /**
     * Set scissor box (with state tracking).
     */
    setScissorBox(x, y, width, height) {
        const sb = this._scissorBox;
        if (sb.x === x && sb.y === y && sb.width === width && sb.height === height) {
            return;
        }
        this._gl.scissor(x, y, width, height);
        sb.x = x;
        sb.y = y;
        sb.width = width;
        sb.height = height;
    }
    /**
     * Reset all state tracking (force re-bind everything).
     * This invalidates ALL cached state so subsequent state manager calls
     * will actually make GL calls instead of being skipped.
     */
    reset() {
        // Reset resource bindings
        this._boundProgram = null;
        this._boundVBO = null;
        this._boundIBO = null;
        this._boundVAO = null;
        this._boundFramebuffer = null;
        this._boundTextures.fill(null);
        this._activeTextureUnit = 0;
        // Reset viewport tracking (use impossible values to force re-set)
        this._viewport = { x: -1, y: -1, width: -1, height: -1 };
        // Reset scissor tracking
        this._scissorTestEnabled = false;
        this._scissorBox = { x: -1, y: -1, width: -1, height: -1 };
        // Reset depth state tracking (use impossible values)
        this._depthTestEnabled = false;
        this._depthWriteEnabled = false;
        this._depthFunc = -1;
        // Reset blend state tracking
        this._blendEnabled = false;
        this._blendSrc = -1;
        this._blendDst = -1;
        // Reset cull face tracking
        this._cullFaceEnabled = false;
        this._cullFace = -1;
        this._frontFace = -1;
    }
    /**
     * Get current state statistics.
     */
    getStats() {
        return {
            boundProgram: !!this._boundProgram,
            boundVBO: !!this._boundVBO,
            boundIBO: !!this._boundIBO,
            boundVAO: !!this._boundVAO,
            boundTextures: this._boundTextures.filter(t => t !== null).length,
            depthTestEnabled: this._depthTestEnabled,
            blendEnabled: this._blendEnabled,
            cullFaceEnabled: this._cullFaceEnabled
        };
    }
}
exports.IgeWebGlStateManager = IgeWebGlStateManager;
