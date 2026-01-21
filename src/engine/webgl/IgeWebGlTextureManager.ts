import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeWebGlResourceManager } from "@/engine/webgl/IgeWebGlResourceManager";
import type { IgeSmartTexture } from "@/types/IgeSmartTexture";

/**
 * Manages WebGL texture creation, updates, and state for the renderer.
 */
export class IgeWebGlTextureManager extends IgeBaseClass {
	classId = "IgeWebGlTextureManager";

	protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
	protected _resourceManager: IgeWebGlResourceManager;

	// Texture binding state tracking (for optimization)
	protected _boundTextures: (WebGLTexture | null)[] = new Array(32).fill(null);
	protected _activeTextureUnit: number = 0;

	// Map IGE textures to WebGL textures
	protected _igeTextureMap: Map<string, WebGLTexture> = new Map();

	// Smart texture tracking
	protected _smartTextureCanvases: Map<string, HTMLCanvasElement> = new Map();

	// Default 1x1 white texture for entities without textures
	protected _defaultWhiteTexture: WebGLTexture | null = null;

	constructor(
		gl: WebGLRenderingContext | WebGL2RenderingContext,
		resourceManager: IgeWebGlResourceManager
	) {
		super();
		this._gl = gl;
		this._resourceManager = resourceManager;

		// Create the default white texture
		this._createDefaultWhiteTexture();
	}

	/**
	 * Create a 1x1 white texture to use as default when no texture is bound.
	 * This allows the base color to show through properly in shaders.
	 */
	protected _createDefaultWhiteTexture(): void {
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
	getDefaultWhiteTexture(): WebGLTexture | null {
		return this._defaultWhiteTexture;
	}

	/**
	 * Create a WebGL texture from an image element.
	 */
	createTextureFromImage(
		textureId: string,
		image: TexImageSource,
		options?: {
			wrapS?: number;
			wrapT?: number;
			minFilter?: number;
			magFilter?: number;
			generateMipmaps?: boolean;
			flipY?: boolean;
		}
	): WebGLTexture | null {
		const gl = this._gl;

		// Create texture
		const texture = this._resourceManager.createTexture(textureId);
		if (!texture) {
			return null;
		}

		// Set default options
		const opts = {
			wrapS: options?.wrapS ?? gl.CLAMP_TO_EDGE,
			wrapT: options?.wrapT ?? gl.CLAMP_TO_EDGE,
			minFilter: options?.minFilter ?? gl.LINEAR,
			magFilter: options?.magFilter ?? gl.LINEAR,
			generateMipmaps: options?.generateMipmaps ?? false,
			flipY: options?.flipY ?? true
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
			const isPowerOf2 = (value: number) => (value & (value - 1)) === 0;
			const width = (image as any).width || 0;
			const height = (image as any).height || 0;
			if (width > 0 && height > 0 && isPowerOf2(width) && isPowerOf2(height)) {
				gl.generateMipmap(gl.TEXTURE_2D);
			} else if (width > 0 && height > 0) {
				this.log(
					`Cannot generate mipmaps for texture "${textureId}" - dimensions must be power of 2`,
					"warning"
				);
			}
		}

		// Unbind texture
		gl.bindTexture(gl.TEXTURE_2D, null);

		return texture;
	}

	/**
	 * Create a WebGL texture from an IGE texture.
	 */
	createTextureFromIgeTexture(igeTexture: IgeTexture): WebGLTexture | null {
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
		const isPowerOf2 = (value: number) => (value & (value - 1)) === 0;
		const width = (image as any).width || 0;
		const height = (image as any).height || 0;
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

	// Cache for blob-based textures (keyed by material ID)
	protected _blobTextureCache: Map<string, WebGLTexture> = new Map();
	protected _blobTexturePromises: Map<string, Promise<WebGLTexture | null>> = new Map();

	/**
	 * Create a WebGL texture from a Blob (e.g., from GLTF embedded image).
	 * Returns a promise since image loading is asynchronous.
	 */
	async createTextureFromBlob(textureId: string, blob: Blob): Promise<WebGLTexture | null> {
		// Check cache first
		if (this._blobTextureCache.has(textureId)) {
			return this._blobTextureCache.get(textureId) || null;
		}

		// Check if already loading
		if (this._blobTexturePromises.has(textureId)) {
			return this._blobTexturePromises.get(textureId) || null;
		}

		// Create promise for loading
		const loadPromise = new Promise<WebGLTexture | null>((resolve) => {
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
	}

	/**
	 * Get a cached blob texture synchronously (returns null if not yet loaded).
	 */
	getBlobTexture(textureId: string): WebGLTexture | null {
		return this._blobTextureCache.get(textureId) || null;
	}

	/**
	 * Check if a blob texture is cached.
	 */
	hasBlobTexture(textureId: string): boolean {
		return this._blobTextureCache.has(textureId);
	}

	/**
	 * Create a WebGL texture from a smart texture (Canvas2D → WebGL).
	 * NOTE: Smart texture full support will be implemented in Phase 4.
	 * For now, this is a placeholder implementation.
	 */
	createTextureFromSmartTexture(
		textureId: string,
		smartTexture: IgeSmartTexture,
		entity: any,
		width: number = 256,
		height: number = 256
	): WebGLTexture | null {
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
		smartTexture.render(ctx as any, entity, undefined);

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
	updateSmartTexture(textureId: string, smartTexture: IgeSmartTexture, entity: any): boolean {
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
		smartTexture.render(ctx as any, entity, undefined);

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
	createEmptyTexture(
		textureId: string,
		width: number,
		height: number,
		internalFormat?: number,
		format?: number,
		type?: number
	): WebGLTexture | null {
		const gl = this._gl;

		const texture = this._resourceManager.createTexture(textureId);
		if (!texture) {
			return null;
		}

		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Set default formats
		const intFormat = internalFormat ?? gl.RGBA;
		const fmt = format ?? gl.RGBA;
		const typ = type ?? gl.UNSIGNED_BYTE;

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
	bindTexture(texture: WebGLTexture | null, unit: number = 0): void {
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
	unbindTexture(unit: number = 0): void {
		this.bindTexture(null, unit);
	}

	/**
	 * Get WebGL texture for an IGE texture.
	 */
	getTextureForIgeTexture(igeTexture: IgeTexture): WebGLTexture | null {
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
	deleteTexture(textureId: string): void {
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
	clearState(): void {
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
