import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeTexture } from "@/engine/core/IgeTexture";
import { igeAnisotropyLevel, igeTextureBytes, igeTextureFormatFromGl } from "@/engine/gpu/IgeGpuTextureFormats";
import type { IgeWebGlResourceManager } from "@/engine/webgl/IgeWebGlResourceManager";
import type { IgeSmartTexture } from "@/types/IgeSmartTexture";

/**
 * What a texture holds, as its memory is counted (IgeWebGlRenderer.gpuMemory()): colours (base colour and emissive
 * maps, sprites, particles, decals, UI pictures), a normal map, or other data (metallic-roughness and occlusion maps,
 * render targets made here, lookups).
 */
export type IgeTextureRole = "color" | "normal" | "data";

/** Bytes of GPU memory by what the textures hold (see IgeTextureRole). */
export type IgeTextureRoleBytes = Record<IgeTextureRole, number>;

/**
 * The key a texture's GPU copy is kept under: its id, and "#srgb" after it for the copy stored sRGB-encoded (a colour
 * map under linear lighting, decoded to linear light as it's sampled). The two copies are separate GL textures.
 */
export function igeTextureKey (id: string, srgb: boolean): string {
	return srgb ? `${id}#srgb` : id;
}

/** SRGB8_ALPHA8: 8-bit RGBA whose colours are decoded from sRGB to linear light as they're sampled (WebGL 2). */
const SRGB8_ALPHA8 = 0x8c43;
/** EXT_texture_filter_anisotropic's texture parameter and limit. */
const TEXTURE_MAX_ANISOTROPY = 0x84fe, MAX_TEXTURE_MAX_ANISOTROPY = 0x84ff;

/**
 * Manages WebGL texture creation, updates, and state for the renderer.
 *
 * Colour maps under linear lighting (IgeWebGlRenderer.linearLighting()) are kept as a second copy stored
 * sRGB-encoded (SRGB8_ALPHA8, see igeTextureKey()), so the GPU decodes them to linear light as it samples them, before
 * filtering and with mipmaps made from the decoded colours. Normal, metallic-roughness and occlusion maps, and
 * pictures the UI layer draws straight to the screen, stay as they are. Which a texture is comes from the slot it
 * fills (the caller says), or from IgeTexture.colorSpace() when the game says.
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

	// WebGL 2 can mipmap textures of any size
	protected _webGl2: boolean;

	// Bytes each texture made here holds and what it holds, by key (smart textures drawn per entity are counted from their entries)
	protected _textureBytes: Map<string, { bytes: number; role: IgeTextureRole }> = new Map();

	/** The keys of the mipmapped textures made here: the ones anisotropic filtering applies to. */
	protected _mipmapped: Set<string> = new Set();
	/** The anisotropic filtering mipmapped textures get (1: off), and the most the GPU allows (1 without the extension). */
	protected _anisotropy: number = 1;
	protected _maxAnisotropy: number = 1;
	/** Colour maps for the scene are made sRGB-encoded (linear lighting): a colour map's copy in the other space is then stale. */
	protected _srgbColors: boolean = false;

	constructor(
		gl: WebGLRenderingContext | WebGL2RenderingContext,
		resourceManager: IgeWebGlResourceManager
	) {
		super();
		this._gl = gl;
		this._resourceManager = resourceManager;
		this._webGl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
		// (Asking for the extension turns it on)
		if (gl.getExtension("EXT_texture_filter_anisotropic")) {
			this._maxAnisotropy = Math.max(1, Number(gl.getParameter(MAX_TEXTURE_MAX_ANISOTROPY)) || 1);
		}

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
	 * Create a WebGL texture from an image element, kept as `textureId` (a key: see igeTextureKey()).
	 * @param options.srgb Stored sRGB-encoded (SRGB8_ALPHA8, WebGL 2): its colours decoded to linear light as it's
	 * sampled. A colour map under linear lighting.
	 * @param options.role What it holds, as its memory is counted (default "color").
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
			srgb?: boolean;
			role?: IgeTextureRole;
		}
	): WebGLTexture | null {
		const gl = this._gl;

		// Create texture (replacing an earlier upload of the same id)
		this._resourceManager.deleteTexture(textureId);
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

		// Upload image data (a colour map under linear lighting stored sRGB-encoded, for the GPU to decode as it samples)
		const srgb = !!options?.srgb && this._webGl2;
		gl.texImage2D(gl.TEXTURE_2D, 0, srgb ? SRGB8_ALPHA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

		// Set texture parameters
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opts.wrapS);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opts.wrapT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.minFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opts.magFilter);

		// Generate mipmaps if requested
		const size = imageSize(image);
		let mipmapped = false;
		if (opts.generateMipmaps) {
			// Check if image dimensions are power of 2
			const isPowerOf2 = (value: number) => (value & (value - 1)) === 0;
			const width = (image as any).width || 0;
			const height = (image as any).height || 0;
			if (width > 0 && height > 0 && (this._webGl2 || (isPowerOf2(width) && isPowerOf2(height)))) {
				gl.generateMipmap(gl.TEXTURE_2D);
				mipmapped = true;
			} else if (width > 0 && height > 0) {
				this.log(
					`Cannot generate mipmaps for texture "${textureId}" - dimensions must be power of 2`,
					"warning"
				);
			}
		}

		// Anisotropic filtering, when it's on, for a mipmapped texture (one that isn't keeps none: GL's default)
		if (mipmapped) {
			this._mipmapped.add(textureId);
			if (this._anisotropy > 1) gl.texParameterf(gl.TEXTURE_2D, TEXTURE_MAX_ANISOTROPY, this._anisotropy);
		} else {
			this._mipmapped.delete(textureId);
		}

		// Unbind texture
		gl.bindTexture(gl.TEXTURE_2D, null);

		// RGBA, 8 bits a channel (sRGB-encoded or not, the same size), and every level of its mip chain
		this._textureBytes.set(textureId, {
			bytes: igeTextureBytes(srgb ? "rgba8unorm-srgb" : "rgba8unorm", size.width, size.height, { mipmaps: mipmapped }),
			role: options?.role ?? "color"
		});
		return texture;
	}

	/**
	 * Bytes of GPU memory the textures made here hold: each counted from its size, format and mip chain (see
	 * IgeGpuTextureFormats), the default white texture and smart textures drawn per entity included.
	 */
	memoryBytes(): number {
		const roles = this.memoryByRole();
		return roles.color + roles.normal + roles.data;
	}

	/**
	 * memoryBytes() by what the textures hold: colour maps (base colour, emissive, sprites, smart textures, UI
	 * pictures), normal maps, and other data (metallic-roughness and occlusion maps, render targets made here, the
	 * default white texture).
	 */
	memoryByRole(): IgeTextureRoleBytes {
		const out: IgeTextureRoleBytes = { color: 0, normal: 0, data: this._defaultWhiteTexture ? 4 : 0 };
		for (const [key, info] of this._textureBytes) {
			if (this._resourceManager.getTexture(key)) out[info.role] += info.bytes;
		}
		for (const entry of this._entitySmartTextures.values()) out.color += entry.width * entry.height * 4;
		return out;
	}

	/**
	 * Gets / sets the anisotropic filtering mipmapped textures are sampled with: up to this many samples along a
	 * surface seen at a slant (a road or a floor ahead), so it stays sharp where trilinear filtering blurs it. 1 is
	 * off (the default); capped at maxAnisotropy(). Applies to the textures made already and those made after.
	 */
	anisotropy(): number;
	anisotropy(level: number): this;
	anisotropy(level?: number): number | this {
		if (level === undefined) return this._anisotropy;
		const next = igeAnisotropyLevel(level, this._maxAnisotropy);
		if (next === this._anisotropy) return this;
		this._anisotropy = next;
		const gl = this._gl;
		for (const key of this._mipmapped) {
			const texture = this._resourceManager.getTexture(key);
			if (!texture) {
				this._mipmapped.delete(key);
				continue;
			}
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameterf(gl.TEXTURE_2D, TEXTURE_MAX_ANISOTROPY, next);
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
		this._boundTextures.fill(null);
		return this;
	}

	/** The most anisotropic filtering the GPU allows (EXT_texture_filter_anisotropic; 1 without it). */
	maxAnisotropy(): number {
		return this._maxAnisotropy;
	}

	/**
	 * Gets / sets whether the scene's colour maps are made sRGB-encoded now (linear lighting on). A colour map made for
	 * the scene from then on lets go of its copy in the other space (the copy that stood in while it was made), so
	 * switching linear lighting at run time doesn't keep both.
	 */
	srgbColors(): boolean;
	srgbColors(val: boolean): this;
	srgbColors(val?: boolean): boolean | this {
		if (val === undefined) return this._srgbColors;
		this._srgbColors = val && this._webGl2;
		return this;
	}

	/**
	 * A scene colour map was just made in the space the scene uses now: its copy in the other space (made before
	 * linear lighting was switched, kept to stand in meanwhile) goes. A copy that holds data, or one drawn by the UI
	 * layer (made unencoded while linear lighting is on), stays.
	 */
	protected _dropStaleTwin(id: string, srgb: boolean, role: IgeTextureRole): void {
		if (role !== "color" || srgb !== this._srgbColors) return;
		const twin = igeTextureKey(id, !srgb);
		if (this._textureBytes.get(twin)?.role === "color") this._deleteKey(twin);
	}

	/**
	 * Create a WebGL texture from an IGE texture.
	 * @param srgb Its copy stored sRGB-encoded (see igeTextureKey()): a colour map under linear lighting.
	 * @param role What it holds, as its memory is counted (default "color").
	 */
	createTextureFromIgeTexture(igeTexture: IgeTexture, srgb: boolean = false, role: IgeTextureRole = "color"): WebGLTexture | null {
		const id = igeTexture.id() || "unknown";
		srgb = srgb && this._webGl2;
		const textureId = igeTextureKey(id, srgb);

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
		const powerOf2 = width > 0 && height > 0 && isPowerOf2(width) && isPowerOf2(height);
		// WebGL 2 mipmaps any size, so sprites drawn smaller than their image
		// (most of them on high-DPI screens) don't shimmer or alias
		const canUseMipmaps = powerOf2 || (this._webGl2 && width > 0 && height > 0);

		// Create WebGL texture from image
		// Use LINEAR filtering when mipmaps aren't available (non-power-of-2
		// textures on WebGL 1)
		// flipY: false - UV coordinates handle the flip instead
		const webglTexture = this.createTextureFromImage(textureId, image, {
			wrapS: powerOf2 ? this._gl.REPEAT : this._gl.CLAMP_TO_EDGE,
			wrapT: powerOf2 ? this._gl.REPEAT : this._gl.CLAMP_TO_EDGE,
			minFilter: canUseMipmaps ? this._gl.LINEAR_MIPMAP_LINEAR : this._gl.LINEAR,
			magFilter: this._gl.LINEAR,
			generateMipmaps: canUseMipmaps,
			flipY: false,
			srgb,
			role
		});

		if (webglTexture) {
			this._igeTextureMap.set(textureId, webglTexture);
			this._dropStaleTwin(id, srgb, role);
		}

		return webglTexture;
	}

	// Per-entity canvases for smart textures (see getSmartTexture())
	protected _entitySmartTextures: Map<object, {
		igeTexture: IgeTexture;
		canvas: HTMLCanvasElement;
		ctx: CanvasRenderingContext2D;
		texture: WebGLTexture;
		width: number;
		height: number;
		lastUsedFrame: number;
		drawnFrame: number;
	}> = new Map();

	/**
	 * Get the GPU texture of a smart texture (an IgeTexture drawn by a
	 * script with the Canvas 2D API) as drawn for one entity. Smart textures
	 * usually draw from the entity's own data and size, so every entity
	 * gets its own canvas, drawn the way the Canvas 2D renderer draws it:
	 * centred, in entity units, scaled by pixelRatio for sharpness.
	 *
	 * Like the Canvas 2D renderer it redraws every frame (once, however many
	 * viewports show the entity), unless the entity has cache(true): then it
	 * redraws only when the entity's cache is marked dirty
	 * (entity.cacheDirty(true)) or its size changes.
	 *
	 * Uploaded as drawn under linear lighting too: sprites and the UI layer show pictures as they are.
	 */
	getSmartTexture(igeTexture: IgeTexture, entity: any, pixelRatio: number, frameId: number): WebGLTexture | null {
		const script = igeTexture.script;
		const scripted = !!script && typeof script.render === "function";
		// Textures such as bitmap font sheets draw each entity themselves
		if (!scripted && !igeTexture._rendersPerEntity) return null;

		const gl = this._gl;
		const scale = Math.max(pixelRatio, 0.25);
		const width = Math.max(1, Math.min(2048, Math.ceil((entity._bounds2d?.x || 1) * scale)));
		const height = Math.max(1, Math.min(2048, Math.ceil((entity._bounds2d?.y || 1) * scale)));

		let entry = this._entitySmartTextures.get(entity);
		if (entry && entry.igeTexture !== igeTexture) {
			gl.deleteTexture(entry.texture);
			entry = undefined;
		}

		// Split-screen views drawing the same entity share one redraw per frame
		let redraw = !entry || entry.width !== width || entry.height !== height ||
			((!entity._cache || entity._cacheDirty) && entry.drawnFrame !== frameId);

		if (!entry) {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			const texture = gl.createTexture();
			if (!ctx || !texture) return null;
			entry = { igeTexture, canvas, ctx, texture, width: 0, height: 0, lastUsedFrame: frameId, drawnFrame: -1 };
			this._entitySmartTextures.set(entity, entry);
			redraw = true;
		}

		if (redraw) {
			const { canvas, ctx } = entry;
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
			}
			entry.width = width;
			entry.height = height;

			// Same space as the Canvas 2D renderer: origin at the entity's
			// centre, one unit per entity pixel
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, width, height);
			ctx.setTransform(width / (entity._bounds2d?.x || 1), 0, 0, height / (entity._bounds2d?.y || 1), width / 2, height / 2);
			ctx.save();
			if (scripted) {
				script!.render(ctx as any, entity, igeTexture);
			} else {
				igeTexture.render(ctx as any, entity);
			}
			ctx.restore();

			gl.bindTexture(gl.TEXTURE_2D, entry.texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			if (entity._cache) entity._cacheDirty = false;
			entry.drawnFrame = frameId;
		}

		entry.lastUsedFrame = frameId;

		// Free canvases of entities that stopped drawing (destroyed, hidden)
		if ((frameId & 127) === 0) {
			for (const [key, value] of this._entitySmartTextures) {
				if (frameId - value.lastUsedFrame > 240) {
					gl.deleteTexture(value.texture);
					this._entitySmartTextures.delete(key);
				}
			}
		}

		return entry.texture;
	}

	// Cache for blob-based textures (keyed by material ID)
	protected _blobTextureCache: Map<string, WebGLTexture> = new Map();
	protected _blobTexturePromises: Map<string, Promise<WebGLTexture | null>> = new Map();

	/**
	 * Create a WebGL texture from a Blob (e.g., from GLTF embedded image).
	 * Returns a promise since image loading is asynchronous.
	 * @param sampler The glTF sampler's filters and wraps (GL constants):
	 * a minFilter asking for mipmaps gets them, LINEAR or NEAREST none.
	 * @param mipmaps Mipmaps when the sampler doesn't say (default false).
	 * @param srgb Stored sRGB-encoded, kept under igeTextureKey(textureId, true): a base colour or emissive map under
	 * linear lighting.
	 * @param role What it holds, as its memory is counted (default "color").
	 */
	async createTextureFromBlob(
		id: string,
		blob: Blob,
		sampler?: { magFilter?: number; minFilter?: number; wrapS?: number; wrapT?: number },
		mipmaps: boolean = false,
		srgb: boolean = false,
		role: IgeTextureRole = "color"
	): Promise<WebGLTexture | null> {
		srgb = srgb && this._webGl2;
		const textureId = igeTextureKey(id, srgb);
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
				// expect origin at top-left, which matches the natural image orientation.
				// Mipmapped (WebGL 2 mipmaps any size) when the sampler asks, or when asked and the sampler doesn't say
				const gl = this._gl;
				const minFilter = sampler?.minFilter;
				const mipmapped = minFilter !== undefined ? minFilter >= gl.NEAREST_MIPMAP_NEAREST && minFilter <= gl.LINEAR_MIPMAP_LINEAR : mipmaps;
				const texture = this.createTextureFromImage(textureId, img, {
					wrapS: sampler?.wrapS ?? gl.REPEAT,
					wrapT: sampler?.wrapT ?? gl.REPEAT,
					minFilter: minFilter ?? (mipmapped ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR),
					magFilter: sampler?.magFilter ?? gl.LINEAR,
					generateMipmaps: mipmapped,
					flipY: false,
					srgb,
					role
				});

				if (texture) {
					this._blobTextureCache.set(textureId, texture);
					this._dropStaleTwin(id, srgb, role);
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
	 * Get a cached blob texture synchronously (returns null if not yet loaded). Asked for the sRGB-encoded copy
	 * (`srgb`) or the other, and it isn't made yet, its copy in the other space stands in (linear lighting switched
	 * while a model was showing: the new copy's image is still decoding).
	 */
	getBlobTexture(textureId: string, srgb: boolean = false): WebGLTexture | null {
		srgb = srgb && this._webGl2;
		return this._blobTextureCache.get(igeTextureKey(textureId, srgb)) || this._blobTextureCache.get(igeTextureKey(textureId, !srgb)) || null;
	}

	/**
	 * Check if a blob texture is cached (its sRGB-encoded copy, with `srgb`; only that one).
	 */
	hasBlobTexture(textureId: string, srgb: boolean = false): boolean {
		return this._blobTextureCache.has(igeTextureKey(textureId, srgb && this._webGl2));
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
		this._textureBytes.set(textureId, { bytes: canvas.width * canvas.height * 4, role: "color" });

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
		// A sized internal format counts as its format does; an unsized one by its channels and type
		const known = igeTextureFormatFromGl(intFormat);
		const channels = fmt === gl.RGBA ? 4 : fmt === gl.RGB ? 3 : fmt === (gl as WebGL2RenderingContext).RG ? 2 : 1;
		const channelBytes = typ === gl.FLOAT ? 4 : typ === (gl as WebGL2RenderingContext).HALF_FLOAT ? 2 : 1;
		const bytes = known ? igeTextureBytes(known, width, height) : width * height * channels * channelBytes;
		this._textureBytes.set(textureId, { bytes, role: "data" });

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
	 * @param srgb Its copy stored sRGB-encoded (see igeTextureKey()): a colour map drawn in the scene under linear
	 * lighting. The UI layer, normal maps and data maps take the other.
	 * @param role What it holds, as its memory is counted (default "color").
	 */
	getTextureForIgeTexture(igeTexture: IgeTexture, srgb: boolean = false, role: IgeTextureRole = "color"): WebGLTexture | null {
		const id = igeTexture.id();
		if (!id) {
			return null;
		}
		const textureId = igeTextureKey(id, srgb && this._webGl2);

		// Pre-filters redraw the texture's canvas whenever it is drawn (e.g.
		// animated effects); here that happens once per frame
		if (igeTexture._preFilters.length && this._preFilteredFrame.get(id) !== this.frameId) {
			this._preFilteredFrame.set(id, this.frameId);
			igeTexture._runPreFilters();
			igeTexture._imageVersion++;
		}

		// Return the uploaded texture unless the image changed since
		// (filters, resizing)
		const version = igeTexture._imageVersion;
		if (this._igeTextureMap.has(textureId) && this._igeTextureVersions.get(textureId) === version) {
			return this._igeTextureMap.get(textureId) || null;
		}

		this._igeTextureMap.delete(textureId);
		const texture = this.createTextureFromIgeTexture(igeTexture, srgb, role);
		this._igeTextureVersions.set(textureId, version);
		return texture;
	}

	/** The renderer's frame number (pre-filters run once per frame). */
	frameId: number = 0;
	protected _igeTextureVersions: Map<string, number> = new Map();
	protected _preFilteredFrame: Map<string, number> = new Map();

	/**
	 * Delete a texture (both its copies: as it is, and sRGB-encoded).
	 */
	deleteTexture(textureId: string): void {
		this._deleteKey(textureId);
		this._deleteKey(igeTextureKey(textureId, true));
		this._preFilteredFrame.delete(textureId);

		// Clean up smart texture canvas if exists
		const canvas = this._smartTextureCanvases.get(textureId);
		if (canvas) {
			this._smartTextureCanvases.delete(textureId);
		}
	}

	/** One GPU copy of a texture let go of (see igeTextureKey()). */
	protected _deleteKey(key: string): void {
		this._resourceManager.deleteTexture(key);
		this._textureBytes.delete(key);
		this._mipmapped.delete(key);
		this._igeTextureMap.delete(key);
		this._igeTextureVersions.delete(key);
		this._blobTextureCache.delete(key);
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

/** An image's, canvas's, bitmap's or video frame's size in pixels (0 when it has none yet). */
function imageSize (image: TexImageSource): { width: number; height: number } {
	const i = image as { naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; displayWidth?: number; displayHeight?: number; width?: number; height?: number };
	return {
		width: i.naturalWidth || i.videoWidth || i.displayWidth || i.width || 0,
		height: i.naturalHeight || i.videoHeight || i.displayHeight || i.height || 0
	};
}
