"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeWebGlPBRMaterial = exports.IgeWebGlMaterial = exports.IgeMaterialCullMode = exports.IgeMaterialBlendMode = void 0;
const IgeBaseClass_1 = require("../core/IgeBaseClass.js");
/**
 * Material blend modes for transparency handling.
 */
var IgeMaterialBlendMode;
(function (IgeMaterialBlendMode) {
    IgeMaterialBlendMode["Opaque"] = "opaque";
    IgeMaterialBlendMode["Transparent"] = "transparent";
    IgeMaterialBlendMode["Additive"] = "additive";
    IgeMaterialBlendMode["Multiply"] = "multiply";
})(IgeMaterialBlendMode || (exports.IgeMaterialBlendMode = IgeMaterialBlendMode = {}));
/**
 * Material cull modes for face culling.
 */
var IgeMaterialCullMode;
(function (IgeMaterialCullMode) {
    IgeMaterialCullMode["None"] = "none";
    IgeMaterialCullMode["Front"] = "front";
    IgeMaterialCullMode["Back"] = "back";
})(IgeMaterialCullMode || (exports.IgeMaterialCullMode = IgeMaterialCullMode = {}));
/**
 * Base material class for WebGL rendering.
 * Defines the visual properties of surfaces.
 */
class IgeWebGlMaterial extends IgeBaseClass_1.IgeBaseClass {
    constructor(id) {
        super();
        this.classId = "IgeWebGlMaterial";
        this._name = "Untitled Material";
        // Base color (RGBA)
        this._color = { r: 1, g: 1, b: 1, a: 1 };
        // Emissive properties
        this._emissiveColor = { r: 0, g: 0, b: 0 };
        this._emissiveIntensity = 1.0;
        // Rendering properties
        this._blendMode = IgeMaterialBlendMode.Opaque;
        this._cullMode = IgeMaterialCullMode.Back;
        this._depthWrite = true;
        this._depthTest = true;
        // Dirty flag for tracking changes
        this._dirty = true;
        this._id = id || `material_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get the material ID.
     */
    id() {
        return this._id;
    }
    /**
     * Gets / sets the material name.
     */
    name(val) {
        if (val !== undefined) {
            this._name = val;
            return this;
        }
        return this._name;
    }
    /**
     * Gets / sets the base color.
     */
    color(r, g, b, a) {
        if (r !== undefined) {
            this._color.r = r;
            this._color.g = g !== null && g !== void 0 ? g : r;
            this._color.b = b !== null && b !== void 0 ? b : r;
            this._color.a = a !== null && a !== void 0 ? a : 1;
            this._dirty = true;
            return this;
        }
        return this._color;
    }
    /**
     * Sets color from hex string (e.g., "#ff0000" or "ff0000").
     */
    colorHex(hex) {
        // Remove # if present
        hex = hex.replace(/^#/, "");
        // Parse hex values
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        const a = hex.length > 6 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
        return this.color(r, g, b, a);
    }
    /**
     * Gets / sets the diffuse (albedo) texture.
     */
    diffuseTexture(texture) {
        if (texture !== undefined) {
            this._diffuseTexture = texture;
            this._dirty = true;
            return this;
        }
        return this._diffuseTexture;
    }
    /**
     * Gets / sets the normal map texture.
     */
    normalTexture(texture) {
        if (texture !== undefined) {
            this._normalTexture = texture;
            this._dirty = true;
            return this;
        }
        return this._normalTexture;
    }
    /**
     * Gets / sets the emissive texture.
     */
    emissiveTexture(texture) {
        if (texture !== undefined) {
            this._emissiveTexture = texture;
            this._dirty = true;
            return this;
        }
        return this._emissiveTexture;
    }
    /**
     * Gets / sets the emissive color.
     */
    emissiveColor(r, g, b) {
        if (r !== undefined) {
            this._emissiveColor.r = r;
            this._emissiveColor.g = g !== null && g !== void 0 ? g : r;
            this._emissiveColor.b = b !== null && b !== void 0 ? b : r;
            this._dirty = true;
            return this;
        }
        return this._emissiveColor;
    }
    /**
     * Gets / sets the emissive intensity.
     */
    emissiveIntensity(val) {
        if (val !== undefined) {
            this._emissiveIntensity = val;
            this._dirty = true;
            return this;
        }
        return this._emissiveIntensity;
    }
    /**
     * Gets / sets the blend mode.
     */
    blendMode(mode) {
        if (mode !== undefined) {
            this._blendMode = mode;
            this._dirty = true;
            return this;
        }
        return this._blendMode;
    }
    /**
     * Gets / sets the cull mode.
     */
    cullMode(mode) {
        if (mode !== undefined) {
            this._cullMode = mode;
            this._dirty = true;
            return this;
        }
        return this._cullMode;
    }
    /**
     * Gets / sets whether depth writing is enabled.
     */
    depthWrite(val) {
        if (val !== undefined) {
            this._depthWrite = val;
            this._dirty = true;
            return this;
        }
        return this._depthWrite;
    }
    /**
     * Gets / sets whether depth testing is enabled.
     */
    depthTest(val) {
        if (val !== undefined) {
            this._depthTest = val;
            this._dirty = true;
            return this;
        }
        return this._depthTest;
    }
    /**
     * Check if material is transparent.
     */
    isTransparent() {
        return this._blendMode !== IgeMaterialBlendMode.Opaque || this._color.a < 1;
    }
    /**
     * Check if material needs updating.
     */
    isDirty() {
        return this._dirty;
    }
    /**
     * Mark material as clean (after GPU upload).
     */
    markClean() {
        this._dirty = false;
    }
    /**
     * Clone this material.
     */
    clone() {
        const cloned = new IgeWebGlMaterial();
        cloned._name = this._name + " (Clone)";
        cloned._color = Object.assign({}, this._color);
        cloned._diffuseTexture = this._diffuseTexture;
        cloned._normalTexture = this._normalTexture;
        cloned._emissiveTexture = this._emissiveTexture;
        cloned._emissiveColor = Object.assign({}, this._emissiveColor);
        cloned._emissiveIntensity = this._emissiveIntensity;
        cloned._blendMode = this._blendMode;
        cloned._cullMode = this._cullMode;
        cloned._depthWrite = this._depthWrite;
        cloned._depthTest = this._depthTest;
        return cloned;
    }
}
exports.IgeWebGlMaterial = IgeWebGlMaterial;
/**
 * PBR (Physically Based Rendering) material with metallic-roughness workflow.
 */
class IgeWebGlPBRMaterial extends IgeWebGlMaterial {
    constructor() {
        super(...arguments);
        this.classId = "IgeWebGlPBRMaterial";
        // PBR properties
        this._metallic = 0.0;
        this._roughness = 0.5;
        this._ambientOcclusion = 1.0;
    }
    /**
     * Gets / sets the metallic value (0 = dielectric, 1 = metal).
     */
    metallic(val) {
        if (val !== undefined) {
            this._metallic = Math.max(0, Math.min(1, val));
            this._dirty = true;
            return this;
        }
        return this._metallic;
    }
    /**
     * Gets / sets the roughness value (0 = smooth, 1 = rough).
     */
    roughness(val) {
        if (val !== undefined) {
            this._roughness = Math.max(0, Math.min(1, val));
            this._dirty = true;
            return this;
        }
        return this._roughness;
    }
    /**
     * Gets / sets the ambient occlusion value.
     */
    ambientOcclusion(val) {
        if (val !== undefined) {
            this._ambientOcclusion = Math.max(0, Math.min(1, val));
            this._dirty = true;
            return this;
        }
        return this._ambientOcclusion;
    }
    /**
     * Gets / sets the metallic-roughness texture.
     * Green channel = roughness, Blue channel = metallic.
     */
    metallicRoughnessTexture(texture) {
        if (texture !== undefined) {
            this._metallicRoughnessTexture = texture;
            this._dirty = true;
            return this;
        }
        return this._metallicRoughnessTexture;
    }
    /**
     * Gets / sets the ambient occlusion texture.
     */
    aoTexture(texture) {
        if (texture !== undefined) {
            this._aoTexture = texture;
            this._dirty = true;
            return this;
        }
        return this._aoTexture;
    }
    /**
     * Clone this PBR material.
     */
    clone() {
        const cloned = new IgeWebGlPBRMaterial();
        // Copy base material properties
        cloned._name = this._name + " (Clone)";
        cloned._color = Object.assign({}, this._color);
        cloned._diffuseTexture = this._diffuseTexture;
        cloned._normalTexture = this._normalTexture;
        cloned._emissiveTexture = this._emissiveTexture;
        cloned._emissiveColor = Object.assign({}, this._emissiveColor);
        cloned._emissiveIntensity = this._emissiveIntensity;
        cloned._blendMode = this._blendMode;
        cloned._cullMode = this._cullMode;
        cloned._depthWrite = this._depthWrite;
        cloned._depthTest = this._depthTest;
        // Copy PBR properties
        cloned._metallic = this._metallic;
        cloned._roughness = this._roughness;
        cloned._ambientOcclusion = this._ambientOcclusion;
        cloned._metallicRoughnessTexture = this._metallicRoughnessTexture;
        cloned._aoTexture = this._aoTexture;
        return cloned;
    }
}
exports.IgeWebGlPBRMaterial = IgeWebGlPBRMaterial;
