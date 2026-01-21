import { IgeBaseClass } from "../core/IgeBaseClass.js"
/**
 * Material blend modes for transparency handling.
 */
export var IgeMaterialBlendMode;
(function (IgeMaterialBlendMode) {
    IgeMaterialBlendMode["Opaque"] = "opaque";
    IgeMaterialBlendMode["Transparent"] = "transparent";
    IgeMaterialBlendMode["Additive"] = "additive";
    IgeMaterialBlendMode["Multiply"] = "multiply";
})(IgeMaterialBlendMode || (IgeMaterialBlendMode = {}));
/**
 * Material cull modes for face culling.
 */
export var IgeMaterialCullMode;
(function (IgeMaterialCullMode) {
    IgeMaterialCullMode["None"] = "none";
    IgeMaterialCullMode["Front"] = "front";
    IgeMaterialCullMode["Back"] = "back";
})(IgeMaterialCullMode || (IgeMaterialCullMode = {}));
/**
 * Base material class for WebGL rendering.
 * Defines the visual properties of surfaces.
 */
export class IgeWebGlMaterial extends IgeBaseClass {
    classId = "IgeWebGlMaterial";
    // Material identification
    _id;
    _name = "Untitled Material";
    // Base color (RGBA)
    _color = { r: 1, g: 1, b: 1, a: 1 };
    // Textures
    _diffuseTexture;
    _normalTexture;
    _emissiveTexture;
    // Raw texture data from GLTF (Blob for creating WebGL textures)
    _baseColorTextureData;
    _baseColorTexCoord = 0;
    // Texture ID for the loaded WebGL texture
    _baseColorTextureId;
    // Emissive properties
    _emissiveColor = { r: 0, g: 0, b: 0 };
    _emissiveIntensity = 1.0;
    // Rendering properties
    _blendMode = IgeMaterialBlendMode.Opaque;
    _cullMode = IgeMaterialCullMode.Back;
    _depthWrite = true;
    _depthTest = true;
    // Shader override (optional custom shader)
    _customShader;
    // Dirty flag for tracking changes
    _dirty = true;
    constructor(id) {
        super();
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
            this._color.g = g ?? r;
            this._color.b = b ?? r;
            this._color.a = a ?? 1;
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
     * Gets / sets the base color texture data (raw Blob from GLTF).
     */
    baseColorTextureData(data, texCoord) {
        if (data !== undefined) {
            this._baseColorTextureData = data;
            this._baseColorTexCoord = texCoord ?? 0;
            this._dirty = true;
            return this;
        }
        return this._baseColorTextureData;
    }
    /**
     * Gets the base color texture coordinate set index.
     */
    baseColorTexCoord() {
        return this._baseColorTexCoord;
    }
    /**
     * Check if material has base color texture data.
     */
    hasBaseColorTexture() {
        return this._baseColorTextureData !== undefined || this._diffuseTexture !== undefined;
    }
    /**
     * Gets / sets the emissive color.
     */
    emissiveColor(r, g, b) {
        if (r !== undefined) {
            this._emissiveColor.r = r;
            this._emissiveColor.g = g ?? r;
            this._emissiveColor.b = b ?? r;
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
        cloned._color = { ...this._color };
        cloned._diffuseTexture = this._diffuseTexture;
        cloned._normalTexture = this._normalTexture;
        cloned._emissiveTexture = this._emissiveTexture;
        cloned._emissiveColor = { ...this._emissiveColor };
        cloned._emissiveIntensity = this._emissiveIntensity;
        cloned._blendMode = this._blendMode;
        cloned._cullMode = this._cullMode;
        cloned._depthWrite = this._depthWrite;
        cloned._depthTest = this._depthTest;
        return cloned;
    }
}
/**
 * PBR (Physically Based Rendering) material with metallic-roughness workflow.
 */
export class IgeWebGlPBRMaterial extends IgeWebGlMaterial {
    classId = "IgeWebGlPBRMaterial";
    // PBR properties
    _metallic = 0.0;
    _roughness = 0.5;
    _ambientOcclusion = 1.0;
    // Additional PBR textures
    _metallicRoughnessTexture;
    _aoTexture;
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
        cloned._color = { ...this._color };
        cloned._diffuseTexture = this._diffuseTexture;
        cloned._normalTexture = this._normalTexture;
        cloned._emissiveTexture = this._emissiveTexture;
        cloned._emissiveColor = { ...this._emissiveColor };
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
