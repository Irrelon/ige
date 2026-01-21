"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeShaderLibrary = void 0;
const sprite_vert_1 = require("./sprite.vert.js");
const sprite_frag_1 = require("./sprite.frag.js");
const model_vert_1 = require("./model.vert.js");
const model_frag_1 = require("./model.frag.js");
const lit_vert_1 = require("./lit.vert.js");
const lit_frag_1 = require("./lit.frag.js");
const shadow_vert_1 = require("./shadow.vert.js");
const shadow_frag_1 = require("./shadow.frag.js");
const skinned_vert_1 = require("./skinned.vert.js");
const skinned_shadow_vert_1 = require("./skinned_shadow.vert.js");
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
IgeShaderLibrary.register("lit", lit_vert_1.litVertexShader, lit_frag_1.litFragmentShader, "PBR lit shader with support for 2D textures, smart textures, and PBR materials");
IgeShaderLibrary.register("shadow", shadow_vert_1.shadowVertexShader, shadow_frag_1.shadowFragmentShader, "Shadow depth pass shader for shadow mapping");
IgeShaderLibrary.register("skinned", skinned_vert_1.skinnedVertexShader, lit_frag_1.litFragmentShader, // Uses same fragment shader as lit
"Skinned PBR lit shader with skeletal animation support (up to 64 bones, 4 influences per vertex)");
IgeShaderLibrary.register("skinned_shadow", skinned_shadow_vert_1.skinnedShadowVertexShader, shadow_frag_1.shadowFragmentShader, // Uses same fragment shader as shadow
"Skinned shadow depth pass shader for shadow mapping with skeletal animation");
