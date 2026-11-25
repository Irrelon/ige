import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeTexture } from "@/engine/core/IgeTexture";

/** A texture's sampling, as glTF gives it (GL constants: 9729 LINEAR, 9987 LINEAR_MIPMAP_LINEAR, 10497 REPEAT...). */
export interface IgeMaterialTextureSampler {
	magFilter?: number;
	minFilter?: number;
	wrapS?: number;
	wrapT?: number;
}

/**
 * Material blend modes for transparency handling.
 */
export enum IgeMaterialBlendMode {
	Opaque = "opaque",
	Transparent = "transparent",
	Additive = "additive",
	Multiply = "multiply"
}

/**
 * Material cull modes for face culling.
 */
export enum IgeMaterialCullMode {
	None = "none",
	Front = "front",
	Back = "back"
}

/**
 * Base material class for WebGL rendering.
 * Defines the visual properties of surfaces.
 */
export class IgeWebGlMaterial extends IgeBaseClass {
	classId = "IgeWebGlMaterial";

	// Material identification
	protected _id: string;
	protected _name: string = "Untitled Material";

	// Base color (RGBA)
	protected _color: { r: number; g: number; b: number; a: number } = { r: 1, g: 1, b: 1, a: 1 };

	// Textures
	protected _diffuseTexture?: IgeTexture;
	protected _normalTexture?: IgeTexture;
	protected _emissiveTexture?: IgeTexture;

	// Raw texture data from GLTF (Blob for creating WebGL textures)
	protected _baseColorTextureData?: Blob;
	/** Encoded emissive image (e.g. from a GLB's emissiveTexture). */
	protected _emissiveTextureData?: Blob;
	/** Encoded normal map image (a glTF's normalTexture) and its strength (normalTexture.scale). */
	protected _normalTextureData?: Blob;
	protected _normalScale: number = 1;
	protected _baseColorTexCoord: number = 0;
	// Texture ID for the loaded WebGL texture
	public _baseColorTextureId?: string;

	// Emissive properties
	protected _emissiveColor: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 };
	protected _emissiveIntensity: number = 1.0;

	// Rendering properties
	protected _blendMode: IgeMaterialBlendMode = IgeMaterialBlendMode.Opaque;
	protected _cullMode: IgeMaterialCullMode = IgeMaterialCullMode.Back;
	protected _depthWrite: boolean = true;
	protected _depthTest: boolean = true;

	// Shader override (optional custom shader)
	protected _customShader?: string;

	// Dirty flag for tracking changes
	protected _dirty: boolean = true;

	constructor(id?: string) {
		super();
		this._id = id || `material_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Get the material ID.
	 */
	id(): string {
		return this._id;
	}

	/**
	 * Gets / sets the material name.
	 */
	name(val?: string): string | this {
		if (val !== undefined) {
			this._name = val;
			return this;
		}
		return this._name;
	}

	/**
	 * Gets / sets the base color.
	 */
	color(r?: number, g?: number, b?: number, a?: number): { r: number; g: number; b: number; a: number } | this {
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
	colorHex(hex: string): this {
		// Remove # if present
		hex = hex.replace(/^#/, "");

		// Parse hex values
		const r = parseInt(hex.substring(0, 2), 16) / 255;
		const g = parseInt(hex.substring(2, 4), 16) / 255;
		const b = parseInt(hex.substring(4, 6), 16) / 255;
		const a = hex.length > 6 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;

		return this.color(r, g, b, a) as this;
	}

	/**
	 * Gets / sets the diffuse (albedo) texture.
	 */
	diffuseTexture(texture?: IgeTexture): IgeTexture | undefined | this {
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
	normalTexture(texture?: IgeTexture): IgeTexture | undefined | this {
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
	emissiveTexture(texture?: IgeTexture): IgeTexture | undefined | this {
		if (texture !== undefined) {
			this._emissiveTexture = texture;
			this._dirty = true;
			return this;
		}
		return this._emissiveTexture;
	}

	/**
	 * Gets / sets the encoded emissive image (raw Blob from a glTF's emissiveTexture).
	 */
	emissiveTextureData(data?: Blob): Blob | undefined | this {
		if (data !== undefined) {
			this._emissiveTextureData = data;
			this._dirty = true;
			return this;
		}
		return this._emissiveTextureData;
	}

	/**
	 * Gets / sets the encoded normal map image (raw Blob from a glTF's normalTexture).
	 */
	normalTextureData(data?: Blob): Blob | undefined | this {
		if (data !== undefined) {
			this._normalTextureData = data;
			this._dirty = true;
			return this;
		}
		return this._normalTextureData;
	}

	/**
	 * Gets / sets how strongly the normal map bends the surface (1 = as authored, 0 = flat).
	 */
	normalScale(val?: number): number | this {
		if (val !== undefined) {
			this._normalScale = val;
			this._dirty = true;
			return this;
		}
		return this._normalScale;
	}

	/**
	 * Gets / sets the encoded base colour image (e.g. from a GLB) and the
	 * texture coordinate set it uses.
	 */
	baseColorTextureData(data?: Blob, texCoord?: number): Blob | undefined | this {
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
	baseColorTexCoord(): number {
		return this._baseColorTexCoord;
	}

	/**
	 * Gets / sets how the base colour texture is sampled, as a glTF sampler gives it (GL filter and wrap constants):
	 * a minFilter that asks for mipmaps gets them, LINEAR or NEAREST gets none.
	 */
	baseColorSampler(): IgeMaterialTextureSampler | undefined;
	baseColorSampler(sampler: IgeMaterialTextureSampler): this;
	baseColorSampler(sampler?: IgeMaterialTextureSampler): IgeMaterialTextureSampler | undefined | this {
		if (sampler === undefined) return this._baseColorSampler;
		this._baseColorSampler = sampler;
		this._dirty = true;
		return this;
	}

	/**
	 * Gets / sets the texture transform (glTF's KHR_texture_transform: uv × scale + offset), e.g. the range a
	 * quantised mesh's texture coordinates are stored in.
	 */
	textureTransform(): { scale: [number, number]; offset: [number, number] } | undefined;
	textureTransform(transform: { scale: [number, number]; offset: [number, number] }): this;
	textureTransform(transform?: { scale: [number, number]; offset: [number, number] }): { scale: [number, number]; offset: [number, number] } | undefined | this {
		if (transform === undefined) return this._textureTransform;
		this._textureTransform = transform;
		this._dirty = true;
		return this;
	}

	protected _baseColorSampler?: IgeMaterialTextureSampler;
	protected _textureTransform?: { scale: [number, number]; offset: [number, number] };

	/**
	 * Check if material has base color texture data.
	 */
	hasBaseColorTexture(): boolean {
		return this._baseColorTextureData !== undefined || this._diffuseTexture !== undefined;
	}

	/**
	 * Gets / sets the emissive color.
	 */
	emissiveColor(r?: number, g?: number, b?: number): { r: number; g: number; b: number } | this {
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
	emissiveIntensity(val?: number): number | this {
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
	blendMode(mode?: IgeMaterialBlendMode): IgeMaterialBlendMode | this {
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
	cullMode(mode?: IgeMaterialCullMode): IgeMaterialCullMode | this {
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
	depthWrite(val?: boolean): boolean | this {
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
	depthTest(val?: boolean): boolean | this {
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
	isTransparent(): boolean {
		return this._blendMode !== IgeMaterialBlendMode.Opaque || this._color.a < 1;
	}

	/**
	 * Check if material needs updating.
	 */
	isDirty(): boolean {
		return this._dirty;
	}

	/**
	 * Mark material as clean (after GPU upload).
	 */
	markClean(): void {
		this._dirty = false;
	}

	/**
	 * Clone this material.
	 */
	clone(): IgeWebGlMaterial {
		const cloned = new IgeWebGlMaterial();
		cloned._name = this._name + " (Clone)";
		cloned._color = { ...this._color };
		cloned._diffuseTexture = this._diffuseTexture;
		cloned._normalTexture = this._normalTexture;
		cloned._emissiveTexture = this._emissiveTexture;
		cloned._emissiveTextureData = this._emissiveTextureData;
		cloned._normalTextureData = this._normalTextureData;
		cloned._normalScale = this._normalScale;
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
	protected _metallic: number = 0.0;
	protected _roughness: number = 0.5;
	protected _ambientOcclusion: number = 1.0;

	// Additional PBR textures
	protected _metallicRoughnessTexture?: IgeTexture;
	protected _aoTexture?: IgeTexture;
	/** Encoded images (from a glTF) and how strongly the occlusion map darkens (occlusionTexture.strength). */
	protected _metallicRoughnessTextureData?: Blob;
	protected _aoTextureData?: Blob;
	protected _aoStrength: number = 1;

	/**
	 * Gets / sets the metallic value (0 = dielectric, 1 = metal).
	 */
	metallic(val?: number): number | this {
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
	roughness(val?: number): number | this {
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
	ambientOcclusion(val?: number): number | this {
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
	metallicRoughnessTexture(texture?: IgeTexture): IgeTexture | undefined | this {
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
	aoTexture(texture?: IgeTexture): IgeTexture | undefined | this {
		if (texture !== undefined) {
			this._aoTexture = texture;
			this._dirty = true;
			return this;
		}
		return this._aoTexture;
	}

	/** Gets / sets the encoded metallic-roughness image (raw Blob from a glTF). */
	metallicRoughnessTextureData(data?: Blob): Blob | undefined | this {
		if (data !== undefined) {
			this._metallicRoughnessTextureData = data;
			this._dirty = true;
			return this;
		}
		return this._metallicRoughnessTextureData;
	}

	/** Gets / sets the encoded occlusion image (raw Blob from a glTF; red channel). */
	aoTextureData(data?: Blob): Blob | undefined | this {
		if (data !== undefined) {
			this._aoTextureData = data;
			this._dirty = true;
			return this;
		}
		return this._aoTextureData;
	}

	/** Gets / sets how strongly the occlusion map darkens ambient light (1 = as authored, 0 = not at all). */
	aoStrength(val?: number): number | this {
		if (val !== undefined) {
			this._aoStrength = val;
			this._dirty = true;
			return this;
		}
		return this._aoStrength;
	}

	/**
	 * Clone this PBR material.
	 */
	clone(): IgeWebGlPBRMaterial {
		const cloned = new IgeWebGlPBRMaterial();
		// Copy base material properties
		cloned._name = this._name + " (Clone)";
		cloned._color = { ...this._color };
		cloned._diffuseTexture = this._diffuseTexture;
		cloned._normalTexture = this._normalTexture;
		cloned._emissiveTexture = this._emissiveTexture;
		cloned._emissiveTextureData = this._emissiveTextureData;
		cloned._normalTextureData = this._normalTextureData;
		cloned._normalScale = this._normalScale;
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
		cloned._metallicRoughnessTextureData = this._metallicRoughnessTextureData;
		cloned._aoTextureData = this._aoTextureData;
		cloned._aoStrength = this._aoStrength;
		return cloned;
	}
}
