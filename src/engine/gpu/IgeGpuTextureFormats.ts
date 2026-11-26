/**
 * Texture formats as the GPU stores them: each one's block (a texel, or a compressed format's 4 x 4 or larger tile) and
 * its bytes, whether its colours are sRGB-encoded (and the same format the other way), and its GL internal format. The
 * byte counts behind GPU memory reports (IgeGpuDevice.memory(), IgeWebGlRenderer.gpuMemory()) come from here: a
 * texture's size, format, layers, samples and mip levels, every level counted (not the "a third more" estimate).
 *
 * The compressed formats (BC, ETC2/EAC, ASTC) are listed for counting and for the GL constants an upload needs; the
 * device doesn't make textures in them yet.
 */

/** Formats the device makes (IgeGpuTextureFormat) and the ones compressed textures come in. WebGPU's names. */
export type IgeTextureFormatName =
	| "rgba8unorm" | "rgba8unorm-srgb" | "r8unorm" | "rg8unorm" | "rgba16float" | "rgba32float" | "r32float"
	| "depth16unorm" | "depth24plus" | "depth24plus-stencil8" | "depth32float"
	| "bc1-rgba-unorm" | "bc1-rgba-unorm-srgb" | "bc3-rgba-unorm" | "bc3-rgba-unorm-srgb"
	| "bc4-r-unorm" | "bc5-rg-unorm" | "bc7-rgba-unorm" | "bc7-rgba-unorm-srgb"
	| "etc2-rgb8unorm" | "etc2-rgb8unorm-srgb" | "etc2-rgba8unorm" | "etc2-rgba8unorm-srgb" | "eac-r11unorm" | "eac-rg11unorm"
	| "astc-4x4-unorm" | "astc-4x4-unorm-srgb" | "astc-5x5-unorm" | "astc-5x5-unorm-srgb"
	| "astc-6x6-unorm" | "astc-6x6-unorm-srgb" | "astc-8x8-unorm" | "astc-8x8-unorm-srgb";

export interface IgeTextureFormatInfo {
	/** Bytes a block takes: a texel's bytes for an uncompressed format. */
	blockBytes: number;
	/** A block's width and height in texels (1 x 1 uncompressed). */
	blockWidth: number;
	blockHeight: number;
	compressed: boolean;
	/** Its colours are sRGB-encoded: decoded to linear light as they're sampled, encoded as they're drawn into. */
	srgb: boolean;
	/** The same format with its colours sRGB-encoded (a linear one's), or not (an sRGB one's). */
	twin?: IgeTextureFormatName;
	/** Its GL internal format (WebGL 2's own, or the extension's for a compressed one). */
	gl: number;
	/** The WebGL extension a compressed format needs (and for its sRGB form, where that's a second one). */
	extension?: string;
}

const plain = (bytes: number, gl: number, twin?: IgeTextureFormatName, srgb = false): IgeTextureFormatInfo => ({ blockBytes: bytes, blockWidth: 1, blockHeight: 1, compressed: false, srgb, twin, gl });
const block = (w: number, h: number, bytes: number, gl: number, extension: string, twin?: IgeTextureFormatName, srgb = false): IgeTextureFormatInfo => ({ blockBytes: bytes, blockWidth: w, blockHeight: h, compressed: true, srgb, twin, gl, extension });

const S3TC = "WEBGL_compressed_texture_s3tc", S3TC_SRGB = "WEBGL_compressed_texture_s3tc_srgb", RGTC = "EXT_texture_compression_rgtc";
const BPTC = "EXT_texture_compression_bptc", ETC = "WEBGL_compressed_texture_etc", ASTC = "WEBGL_compressed_texture_astc";

export const IGE_TEXTURE_FORMATS: Readonly<Record<IgeTextureFormatName, IgeTextureFormatInfo>> = {
	"rgba8unorm": plain(4, 0x8058, "rgba8unorm-srgb"), // RGBA8
	"rgba8unorm-srgb": plain(4, 0x8c43, "rgba8unorm", true), // SRGB8_ALPHA8
	"r8unorm": plain(1, 0x8229), // R8
	"rg8unorm": plain(2, 0x822b), // RG8
	"rgba16float": plain(8, 0x881a), // RGBA16F
	"rgba32float": plain(16, 0x8814), // RGBA32F
	"r32float": plain(4, 0x822e), // R32F
	"depth16unorm": plain(2, 0x81a5), // DEPTH_COMPONENT16
	"depth24plus": plain(4, 0x81a6), // DEPTH_COMPONENT24
	"depth24plus-stencil8": plain(4, 0x88f0), // DEPTH24_STENCIL8
	"depth32float": plain(4, 0x8cac), // DEPTH_COMPONENT32F
	// BC (desktop): BC1 and BC4 8 bytes a 4 x 4 block, the rest 16
	"bc1-rgba-unorm": block(4, 4, 8, 0x83f1, S3TC, "bc1-rgba-unorm-srgb"), // COMPRESSED_RGBA_S3TC_DXT1_EXT
	"bc1-rgba-unorm-srgb": block(4, 4, 8, 0x8c4d, S3TC_SRGB, "bc1-rgba-unorm", true), // COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT
	"bc3-rgba-unorm": block(4, 4, 16, 0x83f3, S3TC, "bc3-rgba-unorm-srgb"), // COMPRESSED_RGBA_S3TC_DXT5_EXT
	"bc3-rgba-unorm-srgb": block(4, 4, 16, 0x8c4f, S3TC_SRGB, "bc3-rgba-unorm", true), // COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT
	"bc4-r-unorm": block(4, 4, 8, 0x8dbb, RGTC), // COMPRESSED_RED_RGTC1_EXT
	"bc5-rg-unorm": block(4, 4, 16, 0x8dbd, RGTC), // COMPRESSED_RED_GREEN_RGTC2_EXT
	"bc7-rgba-unorm": block(4, 4, 16, 0x8e8c, BPTC, "bc7-rgba-unorm-srgb"), // COMPRESSED_RGBA_BPTC_UNORM_EXT
	"bc7-rgba-unorm-srgb": block(4, 4, 16, 0x8e8d, BPTC, "bc7-rgba-unorm", true), // COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT
	// ETC2 and EAC (mobile): 8 bytes a 4 x 4 block without alpha or for one channel, 16 with alpha or two channels
	"etc2-rgb8unorm": block(4, 4, 8, 0x9274, ETC, "etc2-rgb8unorm-srgb"), // COMPRESSED_RGB8_ETC2
	"etc2-rgb8unorm-srgb": block(4, 4, 8, 0x9275, ETC, "etc2-rgb8unorm", true), // COMPRESSED_SRGB8_ETC2
	"etc2-rgba8unorm": block(4, 4, 16, 0x9278, ETC, "etc2-rgba8unorm-srgb"), // COMPRESSED_RGBA8_ETC2_EAC
	"etc2-rgba8unorm-srgb": block(4, 4, 16, 0x9279, ETC, "etc2-rgba8unorm", true), // COMPRESSED_SRGB8_ALPHA8_ETC2_EAC
	"eac-r11unorm": block(4, 4, 8, 0x9270, ETC), // COMPRESSED_R11_EAC
	"eac-rg11unorm": block(4, 4, 16, 0x9272, ETC), // COMPRESSED_RG11_EAC
	// ASTC: always 16 bytes a block, the block's size sets the rate
	"astc-4x4-unorm": block(4, 4, 16, 0x93b0, ASTC, "astc-4x4-unorm-srgb"), // COMPRESSED_RGBA_ASTC_4x4_KHR
	"astc-4x4-unorm-srgb": block(4, 4, 16, 0x93d0, ASTC, "astc-4x4-unorm", true), // COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR
	"astc-5x5-unorm": block(5, 5, 16, 0x93b2, ASTC, "astc-5x5-unorm-srgb"),
	"astc-5x5-unorm-srgb": block(5, 5, 16, 0x93d2, ASTC, "astc-5x5-unorm", true),
	"astc-6x6-unorm": block(6, 6, 16, 0x93b4, ASTC, "astc-6x6-unorm-srgb"),
	"astc-6x6-unorm-srgb": block(6, 6, 16, 0x93d4, ASTC, "astc-6x6-unorm", true),
	"astc-8x8-unorm": block(8, 8, 16, 0x93b7, ASTC, "astc-8x8-unorm-srgb"),
	"astc-8x8-unorm-srgb": block(8, 8, 16, 0x93d7, ASTC, "astc-8x8-unorm", true)
};

/** A format by its GL internal format (undefined: not one listed). */
export function igeTextureFormatFromGl (internalFormat: number): IgeTextureFormatName | undefined {
	for (const name in IGE_TEXTURE_FORMATS) {
		if (IGE_TEXTURE_FORMATS[name as IgeTextureFormatName].gl === internalFormat) return name as IgeTextureFormatName;
	}
	return undefined;
}

/** A format whose colours are sRGB-encoded (`srgb`) or not: its twin, or itself when it has none (data formats). */
export function igeTextureFormatInSpace (format: IgeTextureFormatName, srgb: boolean): IgeTextureFormatName {
	const info = IGE_TEXTURE_FORMATS[format];
	return info.srgb === srgb || !info.twin ? format : info.twin;
}

/** How many levels a full mip chain has for a texture this size: down to 1 x 1. */
export function igeMipLevels (width: number, height: number): number {
	return Math.floor(Math.log2(Math.max(1, width, height))) + 1;
}

/** Bytes one level (or layer) takes: its blocks (whole ones: a 2 x 2 level of a 4 x 4 format takes a block). */
export function igeTextureLevelBytes (format: IgeTextureFormatName, width: number, height: number): number {
	if (width <= 0 || height <= 0) return 0;
	const f = IGE_TEXTURE_FORMATS[format];
	return Math.ceil(width / f.blockWidth) * Math.ceil(height / f.blockHeight) * f.blockBytes;
}

export interface IgeTextureBytesOptions {
	/** Its mip chain: true, every level down to 1 x 1; a number, that many levels (1: the first alone). Default none. */
	mipmaps?: boolean | number;
	/** Its first level held (0 by default): a texture streamed in small levels first has only the smaller ones. */
	baseLevel?: number;
	/** An array texture's layers (default 1). */
	layers?: number;
	/** A multisampled target's samples a texel (default 1). */
	samples?: number;
}

/**
 * Bytes a texture takes on the GPU: each level it has, at its size (halved each level, at least one texel, in whole
 * blocks), times its layers and samples. What a driver adds (alignment, padding) isn't known.
 */
export function igeTextureBytes (format: IgeTextureFormatName, width: number, height: number, opts: IgeTextureBytesOptions = {}): number {
	// (No storage yet: nothing)
	if (width <= 0 || height <= 0) return 0;
	const full = igeMipLevels(width, height);
	const levels = opts.mipmaps === true ? full : typeof opts.mipmaps === "number" ? Math.max(1, Math.min(full, Math.floor(opts.mipmaps))) : 1;
	const base = Math.max(0, Math.min(levels - 1, Math.floor(opts.baseLevel ?? 0)));
	let bytes = 0;
	for (let level = base; level < levels; level++) {
		bytes += igeTextureLevelBytes(format, Math.max(1, width >> level), Math.max(1, height >> level));
	}
	return bytes * Math.max(1, opts.layers ?? 1) * Math.max(1, opts.samples ?? 1);
}

/**
 * The anisotropic filtering level to use: what's asked for, at least 1 (off) and at most what the GPU allows (`max`,
 * 1 without EXT_texture_filter_anisotropic). Not a number, or 1 and under: off.
 */
export function igeAnisotropyLevel (requested: number, max: number): number {
	if (!Number.isFinite(requested) || requested <= 1) return 1;
	const cap = Number.isFinite(max) && max > 1 ? max : 1;
	return Math.min(requested, cap);
}
