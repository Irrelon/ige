/**
 * Texture formats: bytes by format, every level of a mip chain, compressed formats' blocks, sRGB twins, and the
 * anisotropic filtering level's clamp.
 */
import {
	IGE_TEXTURE_FORMATS, igeAnisotropyLevel, igeMipLevels, igeTextureBytes, igeTextureFormatFromGl, igeTextureFormatInSpace,
	igeTextureLevelBytes, type IgeTextureFormatName
} from "@/engine/gpu/IgeGpuTextureFormats";

describe("Texture bytes", () => {
	it("counts an uncompressed texture by its format's bytes a texel", () => {
		expect(igeTextureBytes("rgba8unorm", 256, 128)).toBe(256 * 128 * 4);
		expect(igeTextureBytes("rgba8unorm-srgb", 256, 128)).toBe(256 * 128 * 4);
		expect(igeTextureBytes("r8unorm", 100, 10)).toBe(1000);
		expect(igeTextureBytes("rg8unorm", 100, 10)).toBe(2000);
		expect(igeTextureBytes("rgba16float", 64, 64)).toBe(64 * 64 * 8);
		expect(igeTextureBytes("rgba32float", 64, 64)).toBe(64 * 64 * 16);
		expect(igeTextureBytes("depth16unorm", 64, 64)).toBe(64 * 64 * 2);
		expect(igeTextureBytes("depth24plus-stencil8", 64, 64)).toBe(64 * 64 * 4);
	});

	it("counts every level of a mip chain, down to 1 x 1 (not the a-third-more estimate)", () => {
		// 256 x 256: 65536 + 16384 + 4096 + 1024 + 256 + 64 + 16 + 4 + 1 texels
		expect(igeTextureBytes("rgba8unorm", 256, 256, { mipmaps: true })).toBe(87381 * 4);
		// Not square: 256 x 64 -> 128 x 32 -> ... -> 4 x 1 -> 2 x 1 -> 1 x 1 (a side stops at 1)
		const levels = [[256, 64], [128, 32], [64, 16], [32, 8], [16, 4], [8, 2], [4, 1], [2, 1], [1, 1]];
		expect(igeMipLevels(256, 64)).toBe(9);
		expect(igeTextureBytes("rgba8unorm", 256, 64, { mipmaps: true })).toBe(levels.reduce((n, [w, h]) => n + w * h * 4, 0));
		// Not a power of two: each level rounds down
		expect(igeMipLevels(300, 200)).toBe(9);
		expect(igeTextureBytes("r8unorm", 3, 3, { mipmaps: true })).toBe(9 + 1);
		// Some of the levels (a texture streamed in, small levels first)
		expect(igeTextureBytes("rgba8unorm", 256, 256, { mipmaps: 3 })).toBe((65536 + 16384 + 4096) * 4);
		expect(igeTextureBytes("rgba8unorm", 256, 256, { mipmaps: true, baseLevel: 2 })).toBe((87381 - 65536 - 16384) * 4);
	});

	it("multiplies by layers and samples", () => {
		expect(igeTextureBytes("r8unorm", 512, 512, { layers: 3 })).toBe(512 * 512 * 3);
		expect(igeTextureBytes("rgba16float", 100, 50, { samples: 4 })).toBe(100 * 50 * 8 * 4);
		expect(igeTextureBytes("rgba8unorm", 0, 50)).toBe(0);
	});

	it("counts compressed formats in whole blocks, small levels taking a whole block", () => {
		// BC1: 8 bytes a 4 x 4 block (half a byte a texel); BC7, BC3, ETC2 RGBA and ASTC 4x4: 16 (a byte a texel)
		expect(igeTextureBytes("bc1-rgba-unorm", 1024, 1024)).toBe(1024 * 1024 / 2);
		expect(igeTextureBytes("bc7-rgba-unorm-srgb", 1024, 1024)).toBe(1024 * 1024);
		expect(igeTextureBytes("etc2-rgb8unorm", 256, 256)).toBe(256 * 256 / 2);
		expect(igeTextureBytes("etc2-rgba8unorm", 256, 256)).toBe(256 * 256);
		expect(igeTextureBytes("astc-4x4-unorm", 256, 256)).toBe(256 * 256);
		// ASTC 8x8: 16 bytes for 64 texels (2 bits a texel); a 10 x 10 picture takes 2 x 2 blocks
		expect(igeTextureBytes("astc-8x8-unorm", 256, 256)).toBe(32 * 32 * 16);
		expect(igeTextureLevelBytes("astc-8x8-unorm", 10, 10)).toBe(4 * 16);
		// A 2 x 2 or 1 x 1 level still takes one block
		expect(igeTextureLevelBytes("bc7-rgba-unorm", 2, 2)).toBe(16);
		expect(igeTextureLevelBytes("bc7-rgba-unorm", 1, 1)).toBe(16);
		// BC7 1024 x 1024 with mips: 1024^2 + 512^2 + ... + 16^2 + 8^2 + 4 x 4 (one block) for 4, 2 and 1
		let chain = 0;
		for (let s = 1024; s >= 4; s >>= 1) chain += s * s;
		chain += 16 + 16;
		expect(igeTextureBytes("bc7-rgba-unorm", 1024, 1024, { mipmaps: true })).toBe(chain);
	});

	it("knows each format's sRGB twin and finds formats by their GL internal format", () => {
		expect(igeTextureFormatInSpace("rgba8unorm", true)).toBe("rgba8unorm-srgb");
		expect(igeTextureFormatInSpace("rgba8unorm-srgb", false)).toBe("rgba8unorm");
		expect(igeTextureFormatInSpace("bc7-rgba-unorm", true)).toBe("bc7-rgba-unorm-srgb");
		expect(igeTextureFormatInSpace("astc-6x6-unorm-srgb", false)).toBe("astc-6x6-unorm");
		// Data formats have none: themselves either way
		expect(igeTextureFormatInSpace("bc5-rg-unorm", true)).toBe("bc5-rg-unorm");
		expect(igeTextureFormatInSpace("rgba16float", true)).toBe("rgba16float");
		// Twins point at each other, and differ only in their encoding
		for (const name of Object.keys(IGE_TEXTURE_FORMATS) as IgeTextureFormatName[]) {
			const f = IGE_TEXTURE_FORMATS[name];
			if (!f.twin) continue;
			const t = IGE_TEXTURE_FORMATS[f.twin];
			expect(t.twin).toBe(name);
			expect(t.srgb).toBe(!f.srgb);
			expect([t.blockBytes, t.blockWidth, t.blockHeight, t.compressed]).toEqual([f.blockBytes, f.blockWidth, f.blockHeight, f.compressed]);
		}
		expect(igeTextureFormatFromGl(0x8c43)).toBe("rgba8unorm-srgb"); // SRGB8_ALPHA8
		expect(igeTextureFormatFromGl(0x881a)).toBe("rgba16float");
		expect(igeTextureFormatFromGl(0x8e8d)).toBe("bc7-rgba-unorm-srgb");
		expect(igeTextureFormatFromGl(0x1908)).toBeUndefined(); // unsized RGBA
	});
});

describe("Anisotropic filtering level", () => {
	it("is off (1) unless asked for, and never more than the GPU allows", () => {
		expect(igeAnisotropyLevel(1, 16)).toBe(1);
		expect(igeAnisotropyLevel(0, 16)).toBe(1);
		expect(igeAnisotropyLevel(-4, 16)).toBe(1);
		expect(igeAnisotropyLevel(NaN, 16)).toBe(1);
		expect(igeAnisotropyLevel(8, 16)).toBe(8);
		expect(igeAnisotropyLevel(16, 16)).toBe(16);
		expect(igeAnisotropyLevel(32, 16)).toBe(16);
		expect(igeAnisotropyLevel(Infinity, 16)).toBe(1);
		// Without the extension (max 1): off whatever's asked
		expect(igeAnisotropyLevel(8, 1)).toBe(1);
		expect(igeAnisotropyLevel(8, NaN)).toBe(1);
	});
});
