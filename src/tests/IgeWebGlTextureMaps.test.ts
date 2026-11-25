import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeGltfLoader } from "@/engine/webgl/IgeGltfLoader";
import { igeComputeTangents } from "@/engine/webgl/IgeTangents";
import { IgeWebGlGeometry } from "@/engine/webgl/IgeWebGlGeometry";
import { IgeWebGlTextureManager } from "@/engine/webgl/IgeWebGlTextureManager";
import { IgeWebGlPBRMaterial } from "@/engine/webgl/IgeWebGlMaterial";

jest.mock("@/engine/gpu/IgeWebGl2GpuDevice", () => ({
	...jest.requireActual("@/engine/gpu/IgeWebGl2GpuDevice"),
	webGl2ExternalTexture: (_device: unknown, tex: unknown) => ({ external: tex })
}));

/** One triangle pair (a quad in the xy plane facing +z, u along +x, v down the image as glTF has it), as glTF buffers. */
function quadGltf (withTangent: boolean, material: any) {
	const positions = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]);
	const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
	const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);
	const tangents = new Float32Array([1, 0, 0, -1, 1, 0, 0, -1, 1, 0, 0, -1, 1, 0, 0, -1]);
	const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
	const parts = [positions, normals, uvs, tangents, indices].map((a) => new Uint8Array(a.buffer));
	const total = parts.reduce((n, p) => n + p.length, 0);
	const bytes = new Uint8Array(total);
	const bufferViews: any[] = [];
	let at = 0;
	for (const p of parts) {
		bufferViews.push({ buffer: 0, byteOffset: at, byteLength: p.length });
		bytes.set(p, at);
		at += p.length;
	}
	const gltf = {
		bufferViews,
		accessors: [
			{ bufferView: 0, componentType: 5126, count: 4, type: "VEC3" },
			{ bufferView: 1, componentType: 5126, count: 4, type: "VEC3" },
			{ bufferView: 2, componentType: 5126, count: 4, type: "VEC2" },
			{ bufferView: 3, componentType: 5126, count: 4, type: "VEC4" },
			{ bufferView: 4, componentType: 5123, count: 6, type: "SCALAR" }
		],
		materials: [material],
		images: [{}, {}, {}],
		textures: [{ source: 0 }, { source: 1 }, { source: 2 }]
	};
	const attributes: any = { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 };
	if (withTangent) attributes.TANGENT = 3;
	return { gltf, buffer: bytes.buffer, primitive: { attributes, indices: 4, material: 0 } };
}

class TestLoader extends IgeGltfLoader {
	primitive (gltf: any, primitive: any, buffer: ArrayBuffer) {
		return this._parsePrimitive(gltf, primitive, [buffer], 0);
	}
	materials (gltf: any) {
		const blob = (n: number) => ({ n }) as unknown as Blob;
		const images = [{ data: blob(0) }, { data: blob(1) }, { data: blob(2) }] as any;
		return this._parseMaterials(gltf, this._parseTextures(gltf), images);
	}
}

const MAPPED = {
	pbrMetallicRoughness: { metallicRoughnessTexture: { index: 0 } },
	normalTexture: { index: 1, scale: 0.5 },
	occlusionTexture: { index: 0, strength: 0.75 }
};

describe("Tangent generation", () => {
	it("gives a quad tangents along +x with handedness +1 (glTF: green up the image)", () => {
		const q = quadGltf(false, MAPPED);
		const geo = new TestLoader().primitive({ ...q.gltf, materials: [{ normalTexture: { index: 1 } }] }, { ...q.primitive, attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 } }, q.buffer);
		expect(geo.tangents).toHaveLength(16);
		for (let v = 0; v < 4; v++) {
			expect(Array.from(geo.tangents!.subarray(v * 4, v * 4 + 4)).map((x) => Math.round(x * 1000) / 1000 + 0)).toEqual([1, 0, 0, 1]);
		}
	});

	it("flips handedness for mirrored UVs and returns nothing without UVs", () => {
		const t = igeComputeTangents({
			vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
			normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
			uvs: new Float32Array([0, 0, 1, 0, 0, 1]) // v up the page here: the opposite way to glTF's quad
		})!;
		expect(t[3]).toBe(-1);
		expect(igeComputeTangents({ vertices: new Float32Array(9), normals: new Float32Array(9) })).toBeUndefined();
	});
});

describe("IgeGltfLoader material maps", () => {
	it("reads the normal, metallic-roughness and occlusion maps with scale, strength and spec factor defaults", () => {
		const q = quadGltf(false, MAPPED);
		const [m] = new TestLoader().materials(q.gltf) as IgeWebGlPBRMaterial[];
		expect((m.normalTextureData() as any).n).toBe(1);
		expect(m.normalScale()).toBe(0.5);
		expect((m.metallicRoughnessTextureData() as any).n).toBe(0);
		expect(m.metallic()).toBe(1); // factors left out with a map: the spec's 1
		expect(m.roughness()).toBe(1);
		expect((m.aoTextureData() as any).n).toBe(0);
		expect(m.aoStrength()).toBe(0.75);
	});

	it("reads no maps from a material without them, and ignores a map on another UV set", () => {
		const q = quadGltf(false, {});
		const loader = new TestLoader();
		const [plain] = loader.materials({ ...q.gltf, materials: [{ pbrMetallicRoughness: { metallicFactor: 0.2 } }] }) as IgeWebGlPBRMaterial[];
		expect(plain.normalTextureData()).toBeUndefined();
		expect(plain.metallicRoughnessTextureData()).toBeUndefined();
		expect(plain.aoTextureData()).toBeUndefined();
		expect(plain.metallic()).toBe(0.2);
		const [other] = loader.materials({ ...q.gltf, materials: [{ normalTexture: { index: 1, texCoord: 1 } }] }) as IgeWebGlPBRMaterial[];
		expect(other.normalTextureData()).toBeUndefined();
	});

	it("uses the file's TANGENT when the material has a normal map, makes tangents when it doesn't have them, and skips them without a map", () => {
		const loader = new TestLoader();
		const withFile = quadGltf(true, MAPPED);
		const a = loader.primitive(withFile.gltf, withFile.primitive, withFile.buffer);
		expect(Array.from(a.tangents!.subarray(0, 4))).toEqual([1, 0, 0, -1]); // the file's own, not recomputed
		const noFile = quadGltf(false, MAPPED);
		expect(loader.primitive(noFile.gltf, noFile.primitive, noFile.buffer).tangents).toHaveLength(16);
		const noMap = quadGltf(true, {});
		expect(loader.primitive({ ...noMap.gltf, materials: [{}] }, noMap.primitive, noMap.buffer).tangents).toBeUndefined();
	});
});

/** The renderer's map handling, without a GPU. */
function fakeRenderer (pbr: boolean) {
	const r = Object.create(IgeWebGlRenderer.prototype) as any;
	r._pbr = pbr;
	r._device = {};
	return r;
}

const block = () => {
	const at: Record<string, number> = { u_hasNormalMap: 0, u_hasMetallicRoughnessTexture: 1, u_hasAoTexture: 2, u_normalScale: 3, u_aoStrength: 4 };
	return { data: new Float32Array(5), at };
};

const item = (tangents: boolean) => ({ geometry: Object.assign(new IgeWebGlGeometry("g", 4), { hasTangents: tangents }), normalScale: 0.5, aoStrength: 0.75 }) as any;

const OPAQUE = 0, FLAT = 3;
const tex = (n: number) => ({ n }) as unknown as WebGLTexture;

describe("Lit draw map flags", () => {
	it("keeps every flag at 0 and binds nothing when there are no maps", () => {
		const pass = { setTexture: jest.fn() };
		const b = block();
		b.data.fill(1);
		fakeRenderer(true)._setLitMaps(pass, b, item(true), undefined, OPAQUE);
		expect(Array.from(b.data.subarray(0, 3))).toEqual([0, 0, 0]);
		expect(pass.setTexture).not.toHaveBeenCalled();
	});

	it("applies the normal map under default lighting, not metallic-roughness or occlusion", () => {
		const pass = { setTexture: jest.fn() };
		const b = block();
		fakeRenderer(false)._setLitMaps(pass, b, item(true), [tex(1), tex(2), tex(3)], OPAQUE);
		expect(Array.from(b.data.subarray(0, 3))).toEqual([1, 0, 0]);
		expect(b.data[3]).toBe(0.5);
		expect(pass.setTexture).toHaveBeenCalledTimes(1);
		expect(pass.setTexture.mock.calls[0][0]).toBe(6);
	});

	it("applies all three under PBR lighting", () => {
		const pass = { setTexture: jest.fn() };
		const b = block();
		fakeRenderer(true)._setLitMaps(pass, b, item(true), [tex(1), tex(2), tex(3)], OPAQUE);
		expect(Array.from(b.data.subarray(0, 3))).toEqual([1, 1, 1]);
		expect(b.data[4]).toBe(0.75);
		expect(pass.setTexture.mock.calls.map((c) => c[0])).toEqual([6, 7, 8]);
	});

	it("skips the normal map on a mesh without tangents, and all maps in a silhouette or mask draw", () => {
		const pass = { setTexture: jest.fn() };
		const b = block();
		fakeRenderer(true)._setLitMaps(pass, b, item(false), [tex(1), null, null], OPAQUE);
		expect(b.data[0]).toBe(0);
		fakeRenderer(true)._setLitMaps(pass, b, item(true), [tex(1), tex(2), tex(3)], FLAT);
		expect(Array.from(b.data.subarray(0, 3))).toEqual([0, 0, 0]);
		expect(pass.setTexture).not.toHaveBeenCalled();
	});

	it("leaves out a map that isn't loaded yet", () => {
		const pass = { setTexture: jest.fn() };
		const b = block();
		fakeRenderer(true)._setLitMaps(pass, b, item(true), [null, tex(2), null], OPAQUE);
		expect(Array.from(b.data.subarray(0, 3))).toEqual([0, 1, 0]);
	});
});

describe("Material data maps", () => {
	it("asks for a map's upload and uses it once loaded", () => {
		const r = fakeRenderer(true);
		const loaded = new Set<string>();
		const requested: string[] = [];
		r._textureManager = { getBlobTexture: (id: string) => (loaded.has(id) ? {} : null) };
		r._requestBlobTexture = (id: string) => requested.push(id);
		const it2 = { mapBlobIds: [undefined, undefined, undefined], mapTextures: [undefined, undefined, undefined] } as any;
		r._applyMap(it2, 0, undefined, "n1", {} as Blob);
		expect(requested).toEqual(["n1"]);
		expect(it2.mapBlobIds[0]).toBeUndefined();
		loaded.add("n1");
		r._applyMap(it2, 0, undefined, "n1", {} as Blob);
		expect(it2.mapBlobIds[0]).toBe("n1");
	});
});

describe("Mipmaps for material maps", () => {
	it("the texture manager makes mipmaps and trilinear filtering only when asked", async () => {
		const gl = { REPEAT: 1, LINEAR: 2, LINEAR_MIPMAP_LINEAR: 3 };
		const tm = Object.create(IgeWebGlTextureManager.prototype) as any;
		tm._gl = gl;
		tm._blobTextureCache = new Map();
		tm._blobTexturePromises = new Map();
		tm.log = jest.fn();
		tm.createTextureFromImage = jest.fn(() => ({}));
		(globalThis as any).Image = class { width = 4; height = 4; onload?: () => void; set src (_: string) { setTimeout(() => this.onload?.(), 0); } };
		URL.createObjectURL = () => "blob:x";
		URL.revokeObjectURL = () => undefined;
		await tm.createTextureFromBlob("base", {} as Blob);
		await tm.createTextureFromBlob("map", {} as Blob, undefined, true);
		const [base, map] = tm.createTextureFromImage.mock.calls.map((c: any[]) => c[2]);
		expect(base).toMatchObject({ generateMipmaps: false, minFilter: gl.LINEAR });
		expect(map).toMatchObject({ generateMipmaps: true, minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR });
	});

	it("the renderer asks for mipmaps for the three maps and not for base colour or emissive", () => {
		const r = fakeRenderer(true);
		const calls: [string, unknown][] = [];
		r._textureManager = {
			getBlobTexture: () => null,
			createTextureFromBlob: (id: string, _blob: Blob, sampler?: unknown, mipmaps?: boolean) => {
				calls.push([id, { sampler, mipmaps }]);
				return new Promise(() => undefined);
			}
		};
		r._pendingBlobTextures = new Set();
		const item = {
			material: { r: 1, g: 1, b: 1, a: 1, metallic: 0, roughness: 0, emissiveR: 0, emissiveG: 0, emissiveB: 0, emissiveIntensity: 0, uvScaleU: 1, uvScaleV: 1, uvOffsetU: 0, uvOffsetV: 0 },
			mapBlobIds: [undefined, undefined, undefined], mapTextures: [undefined, undefined, undefined], normalScale: 1, aoStrength: 1
		} as any;
		const blob = {} as Blob;
		r._applyMaterialData(item, {
			textureId: "base", textureBlob: blob, emissiveTextureId: "emissive", emissiveTextureBlob: blob,
			normalTextureId: "normal", normalTextureBlob: blob, metallicRoughnessTextureId: "mr", metallicRoughnessTextureBlob: blob,
			aoTextureId: "ao", aoTextureBlob: blob
		});
		const by = Object.fromEntries(calls);
		expect(by.normal).toEqual({ sampler: undefined, mipmaps: true });
		expect(by.mr).toEqual({ sampler: undefined, mipmaps: true });
		expect(by.ao).toEqual({ sampler: undefined, mipmaps: true });
		expect(by.base).toEqual({ sampler: undefined, mipmaps: false });
		expect(by.emissive).toEqual({ sampler: undefined, mipmaps: false });
		expect(calls).toHaveLength(5);
		// ...unless modelTextureMipmaps(true) (off by default)
		expect(new IgeWebGlRenderer().modelTextureMipmaps()).toBe(false);
		r.modelTextureMipmaps(true);
		r._pendingBlobTextures = new Set();
		calls.length = 0;
		r._applyMaterialData(item, { textureId: "base", textureBlob: blob });
		expect(Object.fromEntries(calls).base).toEqual({ sampler: undefined, mipmaps: true });
	});
});
