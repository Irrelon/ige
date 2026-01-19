"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeWebGlShaderManager = void 0;
const IgeBaseClass_1 = require("../core/IgeBaseClass.js");
const IgeWebGlProgram_1 = require("./IgeWebGlProgram.js");
/**
 * Manages shader compilation, linking, and caching for WebGL renderer.
 */
class IgeWebGlShaderManager extends IgeBaseClass_1.IgeBaseClass {
    constructor(gl, resourceManager) {
        super();
        this.classId = "IgeWebGlShaderManager";
        // Cached compiled programs
        this._programs = new Map();
        this._gl = gl;
        this._resourceManager = resourceManager;
    }
    /**
     * Compile a shader from source code.
     */
    _compileShader(source, type, shaderId) {
        const shader = this._resourceManager.createShader(shaderId, type);
        if (!shader) {
            return null;
        }
        // Set shader source and compile
        this._gl.shaderSource(shader, source);
        this._gl.compileShader(shader);
        // Check compilation status
        const success = this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS);
        if (!success) {
            const error = this._gl.getShaderInfoLog(shader);
            this.log(`Shader compilation failed for "${shaderId}":\n${error}`, "error");
            this._resourceManager.deleteShader(shaderId);
            return null;
        }
        return shader;
    }
    /**
     * Link vertex and fragment shaders into a program.
     */
    _linkProgram(vertexShader, fragmentShader, programId) {
        const program = this._resourceManager.createProgram(programId);
        if (!program) {
            return null;
        }
        // Attach shaders and link program
        this._gl.attachShader(program, vertexShader);
        this._gl.attachShader(program, fragmentShader);
        this._gl.linkProgram(program);
        // Check link status
        const success = this._gl.getProgramParameter(program, this._gl.LINK_STATUS);
        if (!success) {
            const error = this._gl.getProgramInfoLog(program);
            this.log(`Program linking failed for "${programId}":\n${error}`, "error");
            this._resourceManager.deleteProgram(programId);
            return null;
        }
        // Validate program (optional, for debugging)
        this._gl.validateProgram(program);
        const valid = this._gl.getProgramParameter(program, this._gl.VALIDATE_STATUS);
        if (!valid) {
            const error = this._gl.getProgramInfoLog(program);
            this.log(`Program validation warning for "${programId}":\n${error}`, "warning");
        }
        return program;
    }
    /**
     * Create a shader program from vertex and fragment shader source.
     * Returns cached program if already compiled.
     */
    createProgram(programId, vertexSource, fragmentSource, forceRecompile = false) {
        // Return cached program if exists and not forcing recompile
        if (!forceRecompile && this._programs.has(programId)) {
            return this._programs.get(programId) || null;
        }
        // If forcing recompile, delete old program
        if (forceRecompile && this._programs.has(programId)) {
            this.deleteProgram(programId);
        }
        const vertexShaderId = `${programId}_vert`;
        const fragmentShaderId = `${programId}_frag`;
        // Compile vertex shader
        const vertexShader = this._compileShader(vertexSource, this._gl.VERTEX_SHADER, vertexShaderId);
        if (!vertexShader) {
            return null;
        }
        // Compile fragment shader
        const fragmentShader = this._compileShader(fragmentSource, this._gl.FRAGMENT_SHADER, fragmentShaderId);
        if (!fragmentShader) {
            // Clean up vertex shader
            this._resourceManager.deleteShader(vertexShaderId);
            return null;
        }
        // Link program
        const program = this._linkProgram(vertexShader, fragmentShader, programId);
        if (!program) {
            // Clean up shaders
            this._resourceManager.deleteShader(vertexShaderId);
            this._resourceManager.deleteShader(fragmentShaderId);
            return null;
        }
        // Shaders can be detached and deleted after linking (optional optimization)
        this._gl.detachShader(program, vertexShader);
        this._gl.detachShader(program, fragmentShader);
        this._resourceManager.deleteShader(vertexShaderId);
        this._resourceManager.deleteShader(fragmentShaderId);
        // Create wrapper and cache
        const programWrapper = new IgeWebGlProgram_1.IgeWebGlProgram(this._gl, program);
        this._programs.set(programId, programWrapper);
        this.log(`Successfully compiled and linked program "${programId}"`);
        return programWrapper;
    }
    /**
     * Get a cached program by id.
     */
    getProgram(programId) {
        return this._programs.get(programId);
    }
    /**
     * Check if a program exists in cache.
     */
    hasProgram(programId) {
        return this._programs.has(programId);
    }
    /**
     * Delete a program and remove from cache.
     */
    deleteProgram(programId) {
        const program = this._programs.get(programId);
        if (program) {
            this._resourceManager.deleteProgram(programId);
            this._programs.delete(programId);
        }
    }
    /**
     * Delete all cached programs.
     */
    deleteAllPrograms() {
        this._programs.forEach((program, id) => {
            this._resourceManager.deleteProgram(id);
        });
        this._programs.clear();
    }
    /**
     * Get list of all cached program IDs.
     */
    getProgramIds() {
        return Array.from(this._programs.keys());
    }
    /**
     * Get statistics about cached programs.
     */
    getStats() {
        return {
            programCount: this._programs.size,
            programs: this.getProgramIds()
        };
    }
}
exports.IgeWebGlShaderManager = IgeWebGlShaderManager;
