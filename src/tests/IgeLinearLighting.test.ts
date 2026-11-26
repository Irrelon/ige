/**
 * Linear lighting and anisotropic filtering: the settings' defaults, colour maps' sRGB copies (and the copies a switch
 * leaves behind let go of), colours converted to linear light on the CPU where they come in, glTF's colours left
 * linear, the programs' variants (the off one exactly the library's source), and anisotropy applied and clamped.
 */
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeWebGl2GpuDevice } from "@/engine/gpu/IgeWebGl2GpuDevice";
import { igeSrgbToLinear } from "@/engine/utils/igeColorSpace";
import { igeColorDefines } from "@/engine/shaders/webgl/chunks";
import { IgeShaderLibrary } from "@/engine/shaders/webgl/shaderLibrary";
import { IgeGltfLoader } from "@/engine/webgl/IgeGltfLoader";
import { IgeGpuMeshPrograms } from "@/engine/webgl/IgeGpuMeshPrograms";
import { mergeGeometry } from "@/engine/webgl/IgeGeometryMerge";
import { getModelParts } from "@/engine/webgl/IgeModelParts";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import { IgeWebGlLightManager } from "@/engine/webgl/IgeWebGlLightManager";
import { IgeWebGlPBRMaterial } from "@/engine/webgl/IgeWebGlMaterial";
import { IgeWebGlPostProcess } from "@/engine/webgl/IgeWebGlPostProcess";
import { IgeWebGlResourceManager } from "@/engine/webgl/IgeWebGlResourceManager";
import { igeTextureKey, IgeWebGlTextureManager } from "@/engine/webgl/IgeWebGlTextureManager";
import type { IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";

const SRGB8_ALPHA8 = 0x8c43, TEXTURE_MAX_ANISOTROPY = 0x84fe, MAX_TEXTURE_MAX_ANISOTROPY = 0x84ff;

/** A stand-in WebGL 2 context: distinct constants, every create* a new token, calls recorded, 16x anisotropy at most. */
function mockGl (maxAnisotropy: number | null = 16) {
	let n = 0;
	const consts = new Map<string, number>();
	const calls: { name: string; args: unknown[] }[] = [];
	const gl = new Proxy({}, {
		get: (_t, prop: string) => {
			if (/^[A-Z0-9_]+$/.test(prop)) {
				if (!consts.has(prop)) consts.set(prop, 0x9000 + consts.size);
				return consts.get(prop);
			}
			if (prop === "getParameter") return (p: number) => (p === MAX_TEXTURE_MAX_ANISOTROPY ? maxAnisotropy : p === consts.get("MAX_SAMPLES") ? 4 : 4096);
			if (prop === "getContextAttributes") return () => ({ stencil: true });
			if (prop === "checkFramebufferStatus") return () => consts.get("FRAMEBUFFER_COMPLETE");
			if (prop === "getExtension") return (name: string) => (name === "EXT_texture_filter_anisotropic" && maxAnisotropy === null ? null : {});
			if (prop.startsWith("create")) return () => ({ token: ++n });
			return (...args: unknown[]) => {
				calls.push({ name: prop, args });
				return undefined;
			};
		}
	}) as unknown as WebGL2RenderingContext;
	return { gl, calls, RGBA: consts.get("RGBA") ?? (gl as any).RGBA };
}

/** A texture manager on the stand-in context, as on WebGL 2 (the engine needs it; jest has no WebGL2RenderingContext). */
function textureManager (maxAnisotropy: number | null = 16) {
	const m = mockGl(maxAnisotropy);
	const resources = new IgeWebGlResourceManager(m.gl, 2);
	const tm = new IgeWebGlTextureManager(m.gl, resources);
	(tm as any)._webGl2 = true;
	return { ...m, tm, resources };
}

/** A picture the size given, standing in for an image, and an IgeTexture-like object for it. */
const picture = (w: number, h: number) => ({ width: w, height: h, naturalWidth: w, naturalHeight: h }) as unknown as TexImageSource;
const igeTexture = (id: string, colorSpace = "auto") => ({ id: () => id, image: picture(64, 64), _imageVersion: 0, _preFilters: [], _colorSpace: colorSpace }) as any;

describe("Linear lighting and anisotropy: defaults", () => {
	it("are off: as every game draws today", () => {
		const r = new IgeWebGlRenderer();
		expect(r.linearLighting()).toBe(false);
		expect(r.anisotropy()).toBe(1);
		expect(r.maxAnisotropy()).toBe(1); // (not set up yet)
		const { tm } = textureManager();
		expect(tm.srgbColors()).toBe(false);
		expect(tm.anisotropy()).toBe(1);
		const post = new IgeWebGlPostProcess({} as IgeWebGl2GpuDevice);
		expect(post.linear).toBe(false);
		expect(new IgeWebGlPBRMaterial().colorSpace()).toBe("srgb");
		expect(igeColorDefines(0)).toBe("");
	});

	it("keep what a game asks for before the renderer is set up", () => {
		const r = new IgeWebGlRenderer();
		r.linearLighting(true).anisotropy(8);
		expect(r.linearLighting()).toBe(true);
		expect(r.anisotropy()).toBe(8);
		r.anisotropy(0);
		expect(r.anisotropy()).toBe(1);
	});
});

describe("Texture manager: colour maps' sRGB copies", () => {
	it("uploads an sRGB copy as SRGB8_ALPHA8, and a plain one as RGBA, as it always did", () => {
		const { tm, calls, gl } = textureManager();
		calls.length = 0; // (the default white texture's)
		tm.createTextureFromImage("plain", picture(4, 4));
		tm.createTextureFromImage("encoded", picture(4, 4), { srgb: true });
		const uploads = calls.filter((c) => c.name === "texImage2D");
		expect(uploads[0].args[2]).toBe(gl.RGBA);
		expect(uploads[1].args[2]).toBe(SRGB8_ALPHA8);
	});

	it("keeps the two copies of a texture apart, counts them by what they hold, and deletes both", () => {
		const { tm, resources } = textureManager();
		const tex = igeTexture("wall");
		const plain = tm.getTextureForIgeTexture(tex);
		const encoded = tm.getTextureForIgeTexture(tex, true);
		expect(plain).not.toBe(encoded);
		expect(resources.getTexture("wall")).toBe(plain);
		expect(resources.getTexture(igeTextureKey("wall", true))).toBe(encoded);
		// Asked again: the same ones
		expect(tm.getTextureForIgeTexture(tex, true)).toBe(encoded);
		const normal = tm.getTextureForIgeTexture(igeTexture("bumps"), false, "normal");
		expect(normal).toBeTruthy();
		const mipmapped = 4 * (64 * 64 + 32 * 32 + 16 * 16 + 8 * 8 + 4 * 4 + 2 * 2 + 1);
		expect(tm.memoryByRole()).toEqual({ color: 2 * mipmapped, normal: mipmapped, data: 4 });
		expect(tm.memoryBytes()).toBe(3 * mipmapped + 4);
		tm.deleteTexture("wall");
		expect(resources.getTexture("wall")).toBeUndefined();
		expect(resources.getTexture(igeTextureKey("wall", true))).toBeUndefined();
		expect(tm.memoryByRole()).toEqual({ color: 0, normal: mipmapped, data: 4 });
	});

	it("lets go of a colour map's copy from before a switch once the new one is made, and keeps data and the UI's", () => {
		const { tm, resources } = textureManager();
		// Off: plain copies of a colour map and of a normal map
		tm.getTextureForIgeTexture(igeTexture("wall"));
		tm.getTextureForIgeTexture(igeTexture("bumps"), false, "normal");
		// On: the colour map's sRGB copy replaces its plain one; the normal map's plain copy stays
		tm.srgbColors(true);
		tm.getTextureForIgeTexture(igeTexture("wall"), true);
		expect(resources.getTexture("wall")).toBeUndefined();
		expect(resources.getTexture("wall#srgb")).toBeTruthy();
		expect(resources.getTexture("bumps")).toBeTruthy();
		// The UI layer's plain copy, made while on, doesn't push out the scene's sRGB one (nor the other way round)
		tm.getTextureForIgeTexture(igeTexture("wall"));
		expect(resources.getTexture("wall")).toBeTruthy();
		expect(resources.getTexture("wall#srgb")).toBeTruthy();
		// Off again: a fresh plain copy for the scene lets go of the sRGB one
		tm.srgbColors(false);
		tm.deleteTexture("wall");
		tm.getTextureForIgeTexture(igeTexture("wall"), true);
		tm.getTextureForIgeTexture(igeTexture("wall"));
		expect(resources.getTexture("wall#srgb")).toBeUndefined();
		expect(resources.getTexture("wall")).toBeTruthy();
	});

	it("stands a model texture's other copy in while the one asked for is still being made", () => {
		const { tm } = textureManager();
		const old = { old: true } as unknown as WebGLTexture;
		(tm as any)._blobTextureCache.set("helmet_baseColor", old);
		expect(tm.getBlobTexture("helmet_baseColor", true)).toBe(old);
		expect(tm.hasBlobTexture("helmet_baseColor", true)).toBe(false);
		expect(tm.hasBlobTexture("helmet_baseColor")).toBe(true);
	});
});

describe("Texture manager: anisotropic filtering", () => {
	it("is set on mipmapped textures made before and after, capped at the GPU's most, and set back to 1", () => {
		const { tm, calls } = textureManager(16);
		expect(tm.maxAnisotropy()).toBe(16);
		tm.createTextureFromImage("early", picture(64, 64), { generateMipmaps: true });
		tm.createTextureFromImage("flat", picture(64, 64)); // no mipmaps: left alone
		const aniso = () => calls.filter((c) => c.name === "texParameterf" && c.args[1] === TEXTURE_MAX_ANISOTROPY).map((c) => c.args[2]);
		expect(aniso()).toEqual([]);
		tm.anisotropy(32);
		expect(tm.anisotropy()).toBe(16);
		expect(aniso()).toEqual([16]);
		tm.createTextureFromImage("late", picture(64, 64), { generateMipmaps: true });
		expect(aniso()).toEqual([16, 16]);
		tm.anisotropy(1);
		expect(aniso()).toEqual([16, 16, 1, 1]);
		// The same level again: nothing set
		tm.anisotropy(1);
		expect(aniso()).toHaveLength(4);
	});

	it("does nothing where the GPU has no anisotropic filtering", () => {
		const { tm, calls } = textureManager(null);
		expect(tm.maxAnisotropy()).toBe(1);
		tm.createTextureFromImage("a", picture(64, 64), { generateMipmaps: true });
		tm.anisotropy(8);
		expect(tm.anisotropy()).toBe(1);
		expect(calls.some((c) => c.name === "texParameterf")).toBe(false);
	});

	it("is a sampler setting on the GPU device too, capped at its limit", () => {
		const { gl, calls } = mockGl(8);
		const d = new IgeWebGl2GpuDevice(gl);
		expect(d.limits.maxAnisotropy).toBe(8);
		const t = d.createTexture({ width: 64, height: 64, format: "rgba8unorm", mipmaps: true, sampler: { minFilter: "linear", mipmapFilter: "linear" } });
		const aniso = () => calls.filter((c) => c.name === "texParameterf" && c.args[1] === TEXTURE_MAX_ANISOTROPY).map((c) => c.args[2]);
		expect(aniso()).toEqual([]);
		d.setSampler(t, { maxAnisotropy: 12 });
		expect(aniso()).toEqual([8]);
		// The sRGB format: SRGB8_ALPHA8 storage, counted like RGBA8
		d.createTexture({ width: 16, height: 16, format: "rgba8unorm-srgb" });
		expect(calls.some((c) => c.name === "texImage2D" && c.args[2] === SRGB8_ALPHA8)).toBe(true);
	});
});

/** A render item as _applyMaterialData fills it. */
const renderItem = () => ({
	material: { r: 1, g: 1, b: 1, a: 1, metallic: 0, roughness: 0, emissiveR: 0, emissiveG: 0, emissiveB: 0, emissiveIntensity: 0, uvScaleU: 1, uvScaleV: 1, uvOffsetU: 0, uvOffsetV: 0 },
	mapBlobIds: [undefined, undefined, undefined], mapTextures: [undefined, undefined, undefined], normalScale: 1, aoStrength: 1
}) as any;

describe("Colours converted to linear light where they come in", () => {
	it("material colours a game gives (objects and hex), as linear light; a glTF material's as they are", () => {
		const r = Object.create(IgeWebGlRenderer.prototype) as any;
		r._linear = true;
		const item = renderItem();
		r._applyMaterialData(item, { color: { r: 0.5, g: 1, b: 0, a: 0.5 }, emissiveColor: { r: 0.5, g: 0.5, b: 0.5 } });
		expect(item.material.r).toBeCloseTo(0.214041, 6);
		expect([item.material.g, item.material.b, item.material.a]).toEqual([1, 0, 0.5]);
		expect(item.material.emissiveR).toBeCloseTo(0.214041, 6);
		r._applyMaterialData(item, { color: "#808080" });
		expect(item.material.r).toBeCloseTo(0.215861, 6);
		// glTF's factors are linear already
		r._applyMaterialData(item, { color: { r: 0.5, g: 0.5, b: 0.5 }, colorSpace: "linear" });
		expect(item.material.r).toBe(0.5);
		// Off: every colour as it is
		r._linear = false;
		r._applyMaterialData(item, { color: { r: 0.5, g: 0.25, b: 0 }, emissiveColor: { r: 0.5, g: 0, b: 0 } });
		expect([item.material.r, item.material.g, item.material.emissiveR]).toEqual([0.5, 0.25, 0.5]);
		r._applyMaterialData(item, { color: "#808080" });
		expect(item.material.r).toBe(128 / 255);
	});

	it("light colours and the hemisphere ambient: each light's colour converted, then scaled and added", () => {
		const lights = new IgeWebGlLightManager();
		const sky = new IgeAmbientLight();
		sky.lightColor(0.5, 0.5, 0.5);
		sky.intensity(0.8);
		sky.groundColor(0.25, 0.2, 0.1);
		lights.addLight(sky);
		const sun = new IgeDirectionalLight();
		sun.lightColor(1, 0.9, 0.5);
		lights.addLight(sun);
		const at = { u_ambientLightColor: 0, u_ambientLightIntensity: 3, u_ambientGroundColor: 4, u_hasDirectionalLight: 7, u_directionalLightDir: 8, u_directionalLightColor: 11, u_directionalLightIntensity: 14, u_numPointLights: 15, u_numSpotLights: 16 };
		const off = new Float32Array(17), on = new Float32Array(17);
		lights.writeLightUniforms(off, at);
		lights.writeLightUniforms(on, at, true);
		expect(off[0]).toBeCloseTo(0.5 * 0.8, 6);
		expect(on[0]).toBeCloseTo(igeSrgbToLinear(0.5) * 0.8, 6);
		expect(on[4]).toBeCloseTo(igeSrgbToLinear(0.25) * 0.8, 6);
		expect(on[6]).toBeCloseTo(igeSrgbToLinear(0.1) * 0.8, 6);
		expect(Array.from(off.subarray(11, 14)).map((v) => +v.toFixed(6))).toEqual([1, 0.9, 0.5]);
		expect(on[12]).toBeCloseTo(igeSrgbToLinear(0.9), 6);
		expect(on[13]).toBeCloseTo(igeSrgbToLinear(0.5), 6);
		// Intensities aren't colours
		expect(on[14]).toBe(off[14]);
		expect(on[3]).toBe(off[3]);
	});

	it("vertex colours: decoded in the vertex shader under linear lighting, unless they're linear already", () => {
		const r = Object.create(IgeWebGlRenderer.prototype) as any;
		const mesh = (hasVertexColors: boolean, linearColors: boolean) => ({ hasVertexColors, linearColors }) as any;
		r._colorVariant = 0;
		expect([r._vertexColorFlag(mesh(false, false)), r._vertexColorFlag(mesh(true, false)), r._vertexColorFlag(mesh(true, true))]).toEqual([0, 1, 1]);
		r._colorVariant = 2;
		expect([r._vertexColorFlag(mesh(false, false)), r._vertexColorFlag(mesh(true, false)), r._vertexColorFlag(mesh(true, true))]).toEqual([0, 2, 1]);
	});

	it("which copy of a texture a slot draws: colour slots sRGB under linear lighting, data slots plain, as the texture says otherwise", () => {
		const r = Object.create(IgeWebGlRenderer.prototype) as any;
		r._linear = true;
		expect(r._srgbColor({ _colorSpace: "auto" })).toBe(true);
		expect(r._srgbColor({ _colorSpace: "linear" })).toBe(false);
		expect(r._srgbData({ _colorSpace: "auto" })).toBe(false);
		expect(r._srgbData({ _colorSpace: "srgb" })).toBe(true);
		r._linear = false;
		expect(r._srgbColor({ _colorSpace: "srgb" })).toBe(false);
	});
});

describe("glTF colours stay linear", () => {
	class TestLoader extends IgeGltfLoader {
		primitive (gltf: any, primitive: any, buffers: ArrayBuffer[]) {
			return this._parsePrimitive(gltf, primitive, buffers, 0);
		}
		materials (gltf: any) {
			return this._parseMaterials(gltf, [], []);
		}
	}

	it("marks COLOR_0 and the materials' factors as linear light (the glTF spec), and model parts keep it", () => {
		const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
		const colors = new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1]);
		const bytes = new Uint8Array(positions.byteLength + colors.byteLength);
		bytes.set(new Uint8Array(positions.buffer), 0);
		bytes.set(new Uint8Array(colors.buffer), positions.byteLength);
		const gltf = {
			bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }, { buffer: 0, byteOffset: positions.byteLength, byteLength: colors.byteLength }],
			accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }, { bufferView: 1, componentType: 5126, count: 3, type: "VEC4" }],
			materials: [{ name: "paint", pbrMetallicRoughness: { baseColorFactor: [0.5, 0.25, 0.1, 1] }, emissiveFactor: [0.2, 0, 0] }]
		};
		const loader = new TestLoader();
		const geometry = loader.primitive(gltf, { attributes: { POSITION: 0, COLOR_0: 1 } }, [bytes.buffer]);
		expect(geometry.colorSpace).toBe("linear");
		expect(loader.primitive(gltf, { attributes: { POSITION: 0 } }, [bytes.buffer]).colorSpace).toBeUndefined();
		const [material] = loader.materials(gltf);
		expect(material.colorSpace()).toBe("linear");
		const model = { id: "m", materials: [material], meshes: [{ primitives: [{ geometry, materialIndex: 0 }] }] } as unknown as IgeGltfModel;
		const [part] = getModelParts(model);
		expect(part.materialData.colorSpace).toBe("linear");
		expect(part.materialData.color).toEqual({ r: 0.5, g: 0.25, b: 0.1, a: 1 });
	});

	it("a merge of linear-coloured pieces is linear; mixed with sRGB ones (or fill colours) it's sRGB, its numbers unchanged", () => {
		const tri = (colorSpace?: "linear") => ({ vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), colors: new Float32Array([0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1]), colorSpace });
		const [linear] = mergeGeometry([{ geometry: tri("linear") }, { geometry: tri("linear") }]);
		expect(linear.geometry.colorSpace).toBe("linear");
		const [mixed] = mergeGeometry([{ geometry: tri("linear") }, { geometry: tri() }]);
		expect(mixed.geometry.colorSpace).toBeUndefined();
		expect(Array.from(mixed.geometry.colors!.subarray(0, 4))).toEqual([0.5, 0.5, 0.5, 1]);
		const [filled] = mergeGeometry([{ geometry: tri("linear") }, { geometry: { vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) }, color: [1, 0, 0] }]);
		expect(filled.geometry.colorSpace).toBeUndefined();
	});
});

describe("Program variants", () => {
	it("compile the library's source unchanged with linear lighting off, and with the defines in front when on", () => {
		const made: { vertex: string; fragment: string; label?: string }[] = [];
		const device = { createShaderModule: (desc: any) => (made.push(desc), { kind: "shader", label: desc.label }) } as any;
		const programs = new IgeGpuMeshPrograms(device);
		const lit = IgeShaderLibrary.get("lit_instanced")!;
		const off = programs.module("lit_instanced", undefined, igeColorDefines(0));
		expect(made[0].vertex).toBe(lit.vertex);
		expect(made[0].fragment).toBe(lit.fragment);
		const linear = programs.module("lit_instanced", undefined, igeColorDefines(1));
		const screen = programs.module("lit_instanced", undefined, igeColorDefines(2));
		expect(new Set([off, linear, screen]).size).toBe(3);
		expect(made[1].fragment).toBe(`#define IGE_LINEAR\n${lit.fragment}`);
		expect(made[2].fragment).toBe(`#define IGE_LINEAR\n#define IGE_SRGB_OUTPUT\n${lit.fragment}`);
		// (A shader wrapping lit's main, such as the phase effect, defines IGE_LIT_WRAPPED and encodes its own result)
		expect(lit.fragment).toContain("#if defined(IGE_SRGB_OUTPUT) && !defined(IGE_LIT_WRAPPED)");
		expect(lit.fragment).toContain("void main() {");
		// Kept: asked again, nothing compiled
		programs.module("lit_instanced", undefined, igeColorDefines(2));
		expect(made).toHaveLength(3);
		// Every lit and effect program has the encode (and their vertex shaders the decode) behind the defines; sprites
		// aren't lit: only a decode into post-processing's linear frame
		for (const id of ["lit", "skinned", "lit_fade", "particle", "decal", "decal_mesh", "debug_line"]) {
			const src = IgeShaderLibrary.get(id)!;
			expect(src.fragment).toMatch(/#ifdef IGE_SRGB_OUTPUT|#if defined\(IGE_SRGB_OUTPUT\)/);
		}
		expect(IgeShaderLibrary.get("sprite")!.fragment).not.toContain("IGE_SRGB_OUTPUT");
		expect(IgeShaderLibrary.get("sprite")!.fragment).toContain("igeSrgbToLinear(finalColor.rgb)");
		for (const id of ["lit", "skinned", "particle", "decal", "decal_mesh", "debug_line"]) {
			expect(IgeShaderLibrary.get(id)!.vertex).toContain("igeSrgbToLinear(");
		}
	});
});
