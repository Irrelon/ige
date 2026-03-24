import { spriteVertexShader } from "./sprite.vert.js"
import { spriteFragmentShader } from "./sprite.frag.js";
import { modelVertexShader } from "./model.vert.js"
import { modelFragmentShader } from "./model.frag.js";
import { litVertexShader } from "./lit.vert.js"
import { litFragmentShader } from "./lit.frag.js";
import { shadowVertexShader } from "./shadow.vert.js"
import { shadowFragmentShader } from "./shadow.frag.js";
import { skinnedVertexShader } from "./skinned.vert.js"
import { skinnedShadowVertexShader } from "./skinned_shadow.vert.js";
import { pointShadowVertexShader } from "./point_shadow.vert.js"
import { pointShadowFragmentShader } from "./point_shadow.frag.js";
import { skinnedPointShadowVertexShader } from "./skinned_point_shadow.vert.js"
import { blurVertexShader } from "./blur.vert.js";
import { blurFragmentShader } from "./blur.frag.js"
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
IgeShaderLibrary.register("lit", litVertexShader, litFragmentShader, "PBR lit shader with support for 2D textures, smart textures, and PBR materials");
IgeShaderLibrary.register("shadow", shadowVertexShader, shadowFragmentShader, "Shadow depth pass shader for shadow mapping");
IgeShaderLibrary.register("skinned", skinnedVertexShader, litFragmentShader, // Uses same fragment shader as lit
"Skinned PBR lit shader with skeletal animation support (up to 64 bones, 4 influences per vertex)");
IgeShaderLibrary.register("skinned_shadow", skinnedShadowVertexShader, shadowFragmentShader, // Uses same fragment shader as shadow
"Skinned shadow depth pass shader for shadow mapping with skeletal animation");
IgeShaderLibrary.register("point_shadow", pointShadowVertexShader, pointShadowFragmentShader, "Point light shadow depth pass shader - writes linear distance to light");
IgeShaderLibrary.register("skinned_point_shadow", skinnedPointShadowVertexShader, pointShadowFragmentShader, // Uses same fragment shader as point_shadow
"Skinned point light shadow depth pass shader with skeletal animation");
IgeShaderLibrary.register("blur", blurVertexShader, blurFragmentShader, "Separable Gaussian blur for VSM shadow map softening");
