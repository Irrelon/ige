/**
 * GPU memory counted from what's made: the device's buffers and textures by kind, the texture manager's own GL
 * textures, and the renderer's report (stats().gpuMemory).
 */
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeWebGl2GpuDevice } from "@/engine/gpu/IgeWebGl2GpuDevice";
import { IgeWebGlResourceManager } from "@/engine/webgl/IgeWebGlResourceManager";
import { IgeWebGlShadowManager } from "@/engine/webgl/IgeWebGlShadowManager";
import { IgeWebGlTextureManager } from "@/engine/webgl/IgeWebGlTextureManager";

/** A stand-in WebGL 2 context: distinct constants, every create* a new token, 4 samples at most. */
function mockGl (): WebGL2RenderingContext {
	let n = 0;
	const consts = new Map<string, number>();
	return new Proxy({}, {
		get: (_t, prop: string) => {
			if (/^[A-Z0-9_]+$/.test(prop)) {
				if (!consts.has(prop)) consts.set(prop, 0x9000 + consts.size);
				return consts.get(prop);
			}
			if (prop === "getParameter") return (p: number) => (p === consts.get("MAX_SAMPLES") ? 4 : 4096);
			if (prop === "getContextAttributes") return () => ({ stencil: true });
			if (prop === "checkFramebufferStatus") return () => consts.get("FRAMEBUFFER_COMPLETE");
			if (prop === "getExtension") return () => ({});
			if (prop.startsWith("create")) return () => ({ token: ++n });
			return () => undefined;
		}
	}) as unknown as WebGL2RenderingContext;
}

const MB = 1024 * 1024;

describe("GPU device memory", () => {
	it("counts buffers by kind: geometry as made, a streamed buffer at its last write, nothing once destroyed", () => {
		const d = new IgeWebGl2GpuDevice(mockGl());
		const mesh = d.createBuffer({ size: 32_000, usage: "vertex", memory: "geometry" });
		const indices = d.createBuffer({ size: 6_000, usage: "index", memory: "geometry" });
		const instances = d.createBuffer({ size: 0, usage: "vertex", stream: true });
		expect(d.memory()).toEqual({ geometry: 38_000, textures: 0, renderTargets: 0, shadowMaps: 0, buffers: 0 });
		d.writeBuffer(instances, 0, new Float32Array(1024));
		expect(d.memory().buffers).toBe(4096);
		d.writeBuffer(instances, 0, new Float32Array(10));
		expect(d.memory().buffers).toBe(40);
		d.destroyBuffer(mesh);
		d.destroyBuffer(indices);
		d.destroyBuffer(instances);
		// (Destroying twice takes nothing more off)
		d.destroyBuffer(instances);
		expect(d.memory()).toEqual({ geometry: 0, textures: 0, renderTargets: 0, shadowMaps: 0, buffers: 0 });
	});

	it("counts textures by size, format, layers, samples and mipmaps; render targets and textures told apart", () => {
		const d = new IgeWebGl2GpuDevice(mockGl());
		const picture = d.createTexture({ width: 256, height: 256, format: "rgba8unorm" });
		expect(d.memory().textures).toBe(256 * 256 * 4);
		// Every level of the mip chain: 256 x 256 down to 1 x 1 (87,381 texels)
		const mipmapped = d.createTexture({ width: 256, height: 256, format: "rgba8unorm", mipmaps: true });
		expect(d.memory().textures).toBe(256 * 256 * 4 + 87381 * 4);
		d.destroyTexture(mipmapped);
		const glyphs = d.createTexture({ width: 512, height: 512, layers: 3, format: "r8unorm" });
		expect(d.memory().textures).toBe(256 * 256 * 4 + 512 * 512 * 3);
		// Multisampled colour and depth: render targets by default (at most the device's 4 samples)
		const frame = d.createTexture({ width: 100, height: 50, format: "rgba16float", sampleCount: 8 });
		const depth = d.createTexture({ width: 100, height: 50, format: "depth24plus-stencil8" });
		expect(d.memory().renderTargets).toBe(100 * 50 * 8 * 4 + 100 * 50 * 4);
		// Resized: counted at the new size
		d.resizeTexture(picture, 128, 64);
		expect(d.memory().textures).toBe(128 * 64 * 4 + 512 * 512 * 3);
		// Told what it is
		const mask = d.createTexture({ width: 10, height: 10, format: "rgba8unorm", memory: "renderTargets" });
		expect(d.memory().renderTargets).toBe(100 * 50 * 8 * 4 + 100 * 50 * 4 + 400);
		for (const t of [picture, glyphs, frame, depth, mask]) d.destroyTexture(t);
		expect(d.memory()).toEqual({ geometry: 0, textures: 0, renderTargets: 0, shadowMaps: 0, buffers: 0 });
	});

	it("after a lost context: counts only what's made again, not what was forgotten", () => {
		const d = new IgeWebGl2GpuDevice(mockGl());
		const kept = d.createBuffer({ size: 0, usage: "vertex", stream: true });
		d.writeBuffer(kept, 0, new Float32Array(100));
		const forgotten = d.createBuffer({ size: 1000, usage: "vertex", memory: "geometry" });
		const target = d.createTexture({ width: 64, height: 64, format: "rgba8unorm", memory: "renderTargets" });
		d.lost = true;
		d.restore();
		expect(d.memory()).toEqual({ geometry: 0, textures: 0, renderTargets: 0, shadowMaps: 0, buffers: 0 });
		// Used again: made again, counted again
		d.writeBuffer(kept, 0, new Float32Array(50));
		d.resizeTexture(target, 32, 32);
		expect(d.memory()).toEqual({ geometry: 0, textures: 0, renderTargets: 32 * 32 * 4, shadowMaps: 0, buffers: 200 });
		// Destroying the forgotten one takes nothing off
		d.destroyBuffer(forgotten);
		expect(d.memory().geometry).toBe(0);
	});

	it("shadow maps, their static caches and point light atlases count as shadow maps", () => {
		const d = new IgeWebGl2GpuDevice(mockGl());
		const shadows = new IgeWebGlShadowManager(d);
		shadows.createShadowMap("sun", { size: 2048 });
		expect(d.memory().shadowMaps).toBe(16 * MB);
		shadows.getShadowCache("sun");
		expect(d.memory().shadowMaps).toBe(32 * MB);
		shadows.createPointShadowMap("lamp", { size: 256 });
		// A 3x2 atlas of 32-bit depth (or 8-bit RGBA: 4 bytes either way) and its 16-bit depth buffer
		expect(d.memory().shadowMaps).toBe(32 * MB + 768 * 512 * 4 + 768 * 512 * 2);
		shadows.clearAll();
		expect(d.memory().shadowMaps).toBe(0);
	});
});

describe("Texture manager memory", () => {
	it("counts each texture it makes by its format and every level of its mip chain, and lets go of deleted ones", () => {
		const gl = mockGl();
		const textures = new IgeWebGlTextureManager(gl, new IgeWebGlResourceManager(gl, 2));
		// The default 1x1 white texture
		expect(textures.memoryBytes()).toBe(4);
		textures.createTextureFromImage("atlas", { width: 64, height: 32 } as unknown as TexImageSource);
		expect(textures.memoryBytes()).toBe(4 + 64 * 32 * 4);
		// 32 x 32, 16 x 16, ... 1 x 1: 1,365 texels
		const mipmapped = 1365 * 4;
		textures.createTextureFromImage("sprite", { naturalWidth: 32, naturalHeight: 32, width: 32, height: 32 } as unknown as TexImageSource, { generateMipmaps: true });
		expect(textures.memoryBytes()).toBe(4 + 64 * 32 * 4 + mipmapped);
		// Replaced at a new size: counted once, at that size
		textures.createTextureFromImage("atlas", { width: 16, height: 16 } as unknown as TexImageSource);
		expect(textures.memoryBytes()).toBe(4 + 16 * 16 * 4 + mipmapped);
		// By what they hold: both colour maps (the default), and a normal map
		textures.createTextureFromImage("bumps", { width: 8, height: 8 } as unknown as TexImageSource, { role: "normal" });
		expect(textures.memoryByRole()).toEqual({ color: 16 * 16 * 4 + mipmapped, normal: 8 * 8 * 4, data: 4 });
		// A render target made here, by its sized format (RGBA16F: 8 bytes a texel)
		textures.createEmptyTexture("target", 10, 10, 0x881a);
		expect(textures.memoryByRole().data).toBe(4 + 10 * 10 * 8);
		for (const id of ["atlas", "sprite", "bumps", "target"]) textures.deleteTexture(id);
		expect(textures.memoryBytes()).toBe(4);
	});
});

describe("Renderer GPU memory report", () => {
	it("adds the device's kinds, the texture manager's textures and an estimate of the canvas", () => {
		const r = Object.create(IgeWebGlRenderer.prototype) as any;
		r._device = { memory: () => ({ geometry: 10, textures: 20, renderTargets: 30, shadowMaps: 40, buffers: 50 }) };
		r._textureManager = { memoryByRole: () => ({ color: 3, normal: 1, data: 1 }) };
		r._contextLost = false;
		r._canvasContext = { drawingBufferWidth: 800, drawingBufferHeight: 600, getContextAttributes: () => ({ antialias: true, depth: true, stencil: true }) };
		const m = (r as IgeWebGlRenderer).gpuMemory();
		// Antialiased: 4 samples of colour and depth-stencil, the resolved colour, and the picture shown
		const canvas = 800 * 600 * ((4 + 4) * 4 + 4 + 4);
		// Textures split by what they hold (the device's own count as other), not added to the total again
		expect(m).toEqual({ geometry: 10, textures: 25, renderTargets: 30, shadowMaps: 40, buffers: 50, canvas, total: 155 + canvas, colorMaps: 3, normalMaps: 1, otherMaps: 21 });
		// Without antialiasing or depth: the colour buffer and the picture shown
		r._canvasContext.getContextAttributes = () => ({ antialias: false, depth: false, stencil: false });
		expect((r as IgeWebGlRenderer).gpuMemory().canvas).toBe(800 * 600 * 8);
	});

	it("stats() carries the memory and the GPU time", () => {
		const r = Object.create(IgeWebGlRenderer.prototype) as any;
		r._device = { memory: () => ({ geometry: 1, textures: 0, renderTargets: 0, shadowMaps: 0, buffers: 0 }) };
		r._stats = { drawCalls: 3, gpuMs: 4.5 };
		const stats = (r as IgeWebGlRenderer).stats();
		expect(stats.drawCalls).toBe(3);
		expect(stats.gpuMs).toBe(4.5);
		expect(stats.gpuMemory.geometry).toBe(1);
		expect(stats.gpuMemory.total).toBe(1);
	});
});
