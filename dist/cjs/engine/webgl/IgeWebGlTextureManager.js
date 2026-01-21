"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeWebGlTextureManager = void 0;
const IgeBaseClass_1 = require("../core/IgeBaseClass.js");
/**
 * Manages WebGL texture creation, updates, and state for the renderer.
 */
class IgeWebGlTextureManager extends IgeBaseClass_1.IgeBaseClass {
    constructor(gl, resourceManager) {
        super();
        this.classId = "IgeWebGlTextureManager";
        // Texture binding state tracking (for optimization)
        this._boundTextures = new Array(32).fill(null);
        this._activeTextureUnit = 0;
        // Map IGE textures to WebGL textures
        this._igeTextureMap = new Map();
        // Smart texture tracking
        this._smartTextureCanvases = new Map();
        // Default 1x1 white texture for entities without textures
        this._defaultWhiteTexture = null;
        // Cache for blob-based textures (keyed by material ID)
        this._blobTextureCache = new Map();
        this._blobTexturePromises = new Map();
        this._gl = gl;
        this._resourceManager = resourceManager;
        // Create the default white texture
        this._createDefaultWhiteTexture();
    }
    /**
     * Create a 1x1 white texture to use as default when no texture is bound.
     * This allows the base color to show through properly in shaders.
     */
    _createDefaultWhiteTexture() {
        const gl = this._gl;
        const texture = gl.createTexture();
        if (!texture) {
            this.log("Failed to create default white texture", "error");
            return;
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Create 1x1 white pixel
        const whitePixel = new Uint8Array([255, 255, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, whitePixel);
        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this._defaultWhiteTexture = texture;
        this.log("Created default 1x1 white texture");
    }
    /**
     * Get the default 1x1 white texture.
     */
    getDefaultWhiteTexture() {
        return this._defaultWhiteTexture;
    }
    /**
     * Create a WebGL texture from an image element.
     */
    createTextureFromImage(textureId, image, options) {
        var _a, _b, _c, _d, _e, _f;
        const gl = this._gl;
        // Create texture
        const texture = this._resourceManager.createTexture(textureId);
        if (!texture) {
            return null;
        }
        // Set default options
        const opts = {
            wrapS: (_a = options === null || options === void 0 ? void 0 : options.wrapS) !== null && _a !== void 0 ? _a : gl.CLAMP_TO_EDGE,
            wrapT: (_b = options === null || options === void 0 ? void 0 : options.wrapT) !== null && _b !== void 0 ? _b : gl.CLAMP_TO_EDGE,
            minFilter: (_c = options === null || options === void 0 ? void 0 : options.minFilter) !== null && _c !== void 0 ? _c : gl.LINEAR,
            magFilter: (_d = options === null || options === void 0 ? void 0 : options.magFilter) !== null && _d !== void 0 ? _d : gl.LINEAR,
            generateMipmaps: (_e = options === null || options === void 0 ? void 0 : options.generateMipmaps) !== null && _e !== void 0 ? _e : false,
            flipY: (_f = options === null || options === void 0 ? void 0 : options.flipY) !== null && _f !== void 0 ? _f : true
        };
        // Bind texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Set pixel storage mode
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, opts.flipY ? 1 : 0);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        // Upload image data
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opts.wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opts.wrapT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opts.magFilter);
        // Generate mipmaps if requested
        if (opts.generateMipmaps) {
            // Check if image dimensions are power of 2
            const isPowerOf2 = (value) => (value & (value - 1)) === 0;
            const width = image.width || 0;
            const height = image.height || 0;
            if (width > 0 && height > 0 && isPowerOf2(width) && isPowerOf2(height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            }
            else if (width > 0 && height > 0) {
                this.log(`Cannot generate mipmaps for texture "${textureId}" - dimensions must be power of 2`, "warning");
            }
        }
        // Unbind texture
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }
    /**
     * Create a WebGL texture from an IGE texture.
     */
    createTextureFromIgeTexture(igeTexture) {
        const textureId = igeTexture.id() || "unknown";
        // Check if already created
        if (this._igeTextureMap.has(textureId)) {
            return this._igeTextureMap.get(textureId) || null;
        }
        // Get the image from IGE texture
        const image = igeTexture.image;
        if (!image) {
            this.log(`IGE texture "${textureId}" has no image`, "error");
            return null;
        }
        // Check if image dimensions are power of 2 for mipmap support
        const isPowerOf2 = (value) => (value & (value - 1)) === 0;
        const width = image.width || 0;
        const height = image.height || 0;
        const canUseMipmaps = width > 0 && height > 0 && isPowerOf2(width) && isPowerOf2(height);
        // Create WebGL texture from image
        // Use LINEAR filtering for non-power-of-2 textures since mipmaps won't work
        // flipY: false - UV coordinates handle the flip instead
        const webglTexture = this.createTextureFromImage(textureId, image, {
            wrapS: canUseMipmaps ? this._gl.REPEAT : this._gl.CLAMP_TO_EDGE,
            wrapT: canUseMipmaps ? this._gl.REPEAT : this._gl.CLAMP_TO_EDGE,
            minFilter: canUseMipmaps ? this._gl.LINEAR_MIPMAP_LINEAR : this._gl.LINEAR,
            magFilter: this._gl.LINEAR,
            generateMipmaps: canUseMipmaps,
            flipY: false
        });
        if (webglTexture) {
            this._igeTextureMap.set(textureId, webglTexture);
        }
        return webglTexture;
    }
    /**
     * Create a WebGL texture from a Blob (e.g., from GLTF embedded image).
     * Returns a promise since image loading is asynchronous.
     */
    createTextureFromBlob(textureId, blob) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check cache first
            if (this._blobTextureCache.has(textureId)) {
                return this._blobTextureCache.get(textureId) || null;
            }
            // Check if already loading
            if (this._blobTexturePromises.has(textureId)) {
                return this._blobTexturePromises.get(textureId) || null;
            }
            // Create promise for loading
            const loadPromise = new Promise((resolve) => {
                // Create object URL from blob
                const url = URL.createObjectURL(blob);
                // Create image element
                const img = new Image();
                img.onload = () => {
                    // Clean up object URL
                    URL.revokeObjectURL(url);
                    // Create WebGL texture from loaded image
                    // Note: GLTF textures use flipY: false because GLTF UV coordinates
                    // expect origin at top-left, which matches the natural image orientation
                    // Use LINEAR filter (not LINEAR_MIPMAP_LINEAR) to avoid mipmap generation issues
                    const texture = this.createTextureFromImage(textureId, img, {
                        wrapS: this._gl.REPEAT,
                        wrapT: this._gl.REPEAT,
                        minFilter: this._gl.LINEAR,
                        magFilter: this._gl.LINEAR,
                        generateMipmaps: false,
                        flipY: false
                    });
                    if (texture) {
                        this._blobTextureCache.set(textureId, texture);
                        this.log(`Created texture "${textureId}" from blob (${img.width}x${img.height})`);
                    }
                    this._blobTexturePromises.delete(textureId);
                    resolve(texture);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    this.log(`Failed to load texture "${textureId}" from blob`, "error");
                    this._blobTexturePromises.delete(textureId);
                    resolve(null);
                };
                img.src = url;
            });
            this._blobTexturePromises.set(textureId, loadPromise);
            return loadPromise;
        });
    }
    /**
     * Get a cached blob texture synchronously (returns null if not yet loaded).
     */
    getBlobTexture(textureId) {
        return this._blobTextureCache.get(textureId) || null;
    }
    /**
     * Check if a blob texture is cached.
     */
    hasBlobTexture(textureId) {
        return this._blobTextureCache.has(textureId);
    }
    /**
     * Create a WebGL texture from a smart texture (Canvas2D → WebGL).
     * NOTE: Smart texture full support will be implemented in Phase 4.
     * For now, this is a placeholder implementation.
     */
    createTextureFromSmartTexture(textureId, smartTexture, entity, width = 256, height = 256) {
        // Create offscreen canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            this.log(`Failed to create 2D context for smart texture "${textureId}"`, "error");
            return null;
        }
        // Execute smart texture render function with entity parameter
        smartTexture.render(ctx, entity, undefined);
        // Create WebGL texture from canvas
        const texture = this.createTextureFromImage(textureId, canvas, {
            wrapS: this._gl.CLAMP_TO_EDGE,
            wrapT: this._gl.CLAMP_TO_EDGE,
            minFilter: this._gl.LINEAR,
            magFilter: this._gl.LINEAR,
            generateMipmaps: false,
            flipY: false
        });
        if (texture) {
            // Store canvas for future updates
            this._smartTextureCanvases.set(textureId, canvas);
        }
        return texture;
    }
    /**
     * Update a smart texture (re-render and upload to GPU).
     * NOTE: Smart texture full support will be implemented in Phase 4.
     */
    updateSmartTexture(textureId, smartTexture, entity) {
        const canvas = this._smartTextureCanvases.get(textureId);
        const texture = this._resourceManager.getTexture(textureId);
        if (!canvas || !texture) {
            this.log(`Smart texture "${textureId}" not found for update`, "error");
            return false;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return false;
        }
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Re-execute render function with entity parameter
        smartTexture.render(ctx, entity, undefined);
        // Upload to GPU
        const gl = this._gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return true;
    }
    /**
     * Create an empty texture for render targets.
     */
    createEmptyTexture(textureId, width, height, internalFormat, format, type) {
        const gl = this._gl;
        const texture = this._resourceManager.createTexture(textureId);
        if (!texture) {
            return null;
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Set default formats
        const intFormat = internalFormat !== null && internalFormat !== void 0 ? internalFormat : gl.RGBA;
        const fmt = format !== null && format !== void 0 ? format : gl.RGBA;
        const typ = type !== null && type !== void 0 ? type : gl.UNSIGNED_BYTE;
        // Allocate storage
        gl.texImage2D(gl.TEXTURE_2D, 0, intFormat, width, height, 0, fmt, typ, null);
        // Set parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }
    /**
     * Bind a texture to a specific texture unit.
     * Tracks state to avoid redundant binding.
     */
    bindTexture(texture, unit = 0) {
        // Check if texture is already bound to this unit
        if (this._boundTextures[unit] === texture && this._activeTextureUnit === unit) {
            return;
        }
        const gl = this._gl;
        // Activate texture unit if different
        if (this._activeTextureUnit !== unit) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            this._activeTextureUnit = unit;
        }
        // Bind texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this._boundTextures[unit] = texture;
    }
    /**
     * Unbind texture from a specific unit.
     */
    unbindTexture(unit = 0) {
        this.bindTexture(null, unit);
    }
    /**
     * Get WebGL texture for an IGE texture.
     */
    getTextureForIgeTexture(igeTexture) {
        const textureId = igeTexture.id();
        if (!textureId) {
            return null;
        }
        // Return existing texture if already created
        if (this._igeTextureMap.has(textureId)) {
            return this._igeTextureMap.get(textureId) || null;
        }
        // Create new texture
        return this.createTextureFromIgeTexture(igeTexture);
    }
    /**
     * Delete a texture.
     */
    deleteTexture(textureId) {
        this._resourceManager.deleteTexture(textureId);
        this._igeTextureMap.delete(textureId);
        // Clean up smart texture canvas if exists
        const canvas = this._smartTextureCanvases.get(textureId);
        if (canvas) {
            this._smartTextureCanvases.delete(textureId);
        }
    }
    /**
     * Clear all texture state.
     */
    clearState() {
        this._boundTextures.fill(null);
        this._activeTextureUnit = 0;
    }
    /**
     * Get statistics about managed textures.
     */
    getStats() {
        return {
            totalTextures: this._igeTextureMap.size,
            smartTextures: this._smartTextureCanvases.size,
            activeTextureUnit: this._activeTextureUnit
        };
    }
}
exports.IgeWebGlTextureManager = IgeWebGlTextureManager;
