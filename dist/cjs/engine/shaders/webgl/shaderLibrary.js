"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeShaderLibrary = void 0;
const sprite_vert_1 = require("./sprite.vert.js");
const sprite_frag_1 = require("./sprite.frag.js");
const model_vert_1 = require("./model.vert.js");
const model_frag_1 = require("./model.frag.js");
/**
 * Built-in shader library for WebGL renderer.
 * Provides centralized registration and lookup of shader programs.
 */
class IgeShaderLibrary {
    /**
     * Register a shader program.
     */
    static register(id, vertexSource, fragmentSource, description) {
        this._shaders.set(id, {
            vertex: vertexSource,
            fragment: fragmentSource,
            description
        });
    }
    /**
     * Get a shader program by id.
     */
    static get(id) {
        return this._shaders.get(id);
    }
    /**
     * Check if a shader exists.
     */
    static has(id) {
        return this._shaders.has(id);
    }
    /**
     * Get all registered shader IDs.
     */
    static getAll() {
        return Array.from(this._shaders.keys());
    }
    /**
     * Clear all registered shaders.
     */
    static clear() {
        this._shaders.clear();
    }
}
exports.IgeShaderLibrary = IgeShaderLibrary;
IgeShaderLibrary._shaders = new Map();
// Register built-in shaders
IgeShaderLibrary.register("sprite", sprite_vert_1.spriteVertexShader, sprite_frag_1.spriteFragmentShader, "2D sprite shader with billboarding support");
IgeShaderLibrary.register("model", model_vert_1.modelVertexShader, model_frag_1.modelFragmentShader, "Basic 3D model shader with simple lighting");
