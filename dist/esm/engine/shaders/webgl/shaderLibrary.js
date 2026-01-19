import { spriteVertexShader } from "./sprite.vert.js"
import { spriteFragmentShader } from "./sprite.frag.js"
import { modelVertexShader } from "./model.vert.js"
import { modelFragmentShader } from "./model.frag.js"
/**
 * Built-in shader library for WebGL renderer.
 * Provides centralized registration and lookup of shader programs.
 */
export class IgeShaderLibrary {
    static _shaders = new Map();
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
// Register built-in shaders
IgeShaderLibrary.register("sprite", spriteVertexShader, spriteFragmentShader, "2D sprite shader with billboarding support");
IgeShaderLibrary.register("model", modelVertexShader, modelFragmentShader, "Basic 3D model shader with simple lighting");
