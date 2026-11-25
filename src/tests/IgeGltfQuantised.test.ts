import { IgeGltfLoader } from "@/engine/webgl/IgeGltfLoader";
import { getModelParts } from "@/engine/webgl/IgeModelParts";
import { IGE_QUANTISED_ENCODINGS, packVertices, positionDecodeMatrix, unpackVertices } from "@/engine/webgl/IgeVertexPacking";
import { IgeWebGlGeometryManager } from "@/engine/webgl/IgeWebGlGeometryManager";
import { meshLayout } from "@/engine/webgl/IgeGpuMeshPrograms";
import { IgeWebGl2GpuDevice } from "@/engine/gpu/IgeWebGl2GpuDevice";

/** A GLB file: the JSON chunk, then the binary one (each padded to 4 bytes). */
function glb (json: object, bin: Uint8Array): ArrayBuffer {
	const text = new TextEncoder().encode(JSON.stringify(json));
	const jsonLen = Math.ceil(text.length / 4) * 4, binLen = Math.ceil(bin.length / 4) * 4;
	const out = new ArrayBuffer(12 + 8 + jsonLen + 8 + binLen);
	const v = new DataView(out), u8 = new Uint8Array(out);
	v.setUint32(0, 0x46546c67, true);
	v.setUint32(4, 2, true);
	v.setUint32(8, out.byteLength, true);
	v.setUint32(12, jsonLen, true);
	v.setUint32(16, 0x4e4f534a, true);
	u8.fill(0x20, 20, 20 + jsonLen);
	u8.set(text, 20);
	v.setUint32(20 + jsonLen, binLen, true);
	v.setUint32(24 + jsonLen, 0x004e4942, true);
	u8.set(bin, 28 + jsonLen);
	return out;
}

/**
 * A quad as gltfpack writes one (KHR_mesh_quantization): positions as unnormalized shorts padded to 8 bytes, normals
 * as normalized bytes padded to 4, texture coordinates as normalized unsigned shorts with a KHR_texture_transform,
 * and the node's scale and translation turning the shorts back into metres.
 */
function quantisedQuad (): ArrayBuffer {
	const bin = new Uint8Array(32 + 16 + 16 + 12 + 4);
	const v = new DataView(bin.buffer);
	const pos = [[-1000, 0, -1000], [1000, 0, -1000], [1000, 2000, 1000], [-1000, 2000, 1000]];
	pos.forEach((p, i) => p.forEach((c, k) => v.setInt16(i * 8 + k * 2, c, true)));
	for (let i = 0; i < 4; i++) {
		v.setInt8(32 + i * 4, 0);
		v.setInt8(32 + i * 4 + 1, 127);
		v.setInt8(32 + i * 4 + 2, 0);
	}
	const uvs = [[0, 65535], [65535, 65535], [65535, 0], [0, 0]];
	uvs.forEach((p, i) => p.forEach((c, k) => v.setUint16(48 + i * 4 + k * 2, c, true)));
	[0, 1, 2, 0, 2, 3].forEach((x, i) => v.setUint16(64 + i * 2, x, true));
	bin.set([0x89, 0x50, 0x4e, 0x47], 76); // an image's first bytes (not decoded here)
	return glb({
		asset: { version: "2.0" },
		extensionsUsed: ["KHR_mesh_quantization", "KHR_texture_transform"],
		extensionsRequired: ["KHR_mesh_quantization"],
		buffers: [{ byteLength: bin.length }],
		bufferViews: [
			{ buffer: 0, byteOffset: 0, byteLength: 32, byteStride: 8, target: 34962 },
			{ buffer: 0, byteOffset: 32, byteLength: 16, byteStride: 4, target: 34962 },
			{ buffer: 0, byteOffset: 48, byteLength: 16, byteStride: 4, target: 34962 },
			{ buffer: 0, byteOffset: 64, byteLength: 12, target: 34963 },
			{ buffer: 0, byteOffset: 76, byteLength: 4 }
		],
		accessors: [
			{ bufferView: 0, componentType: 5122, count: 4, type: "VEC3", min: [-1000, 0, -1000], max: [1000, 2000, 1000] },
			{ bufferView: 1, componentType: 5120, normalized: true, count: 4, type: "VEC3" },
			{ bufferView: 2, componentType: 5123, normalized: true, count: 4, type: "VEC2" },
			{ bufferView: 3, componentType: 5123, count: 6, type: "SCALAR" }
		],
		images: [{ bufferView: 4, mimeType: "image/png" }],
		samplers: [{ magFilter: 9729, minFilter: 9729 }],
		textures: [{ source: 0, sampler: 0 }],
		materials: [{
			pbrMetallicRoughness: {
				baseColorTexture: { index: 0, extensions: { KHR_texture_transform: { offset: [0.25, 0.5], scale: [0.5, 0.25] } } }
			}
		}],
		meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
		nodes: [{ mesh: 0, name: "Quad", scale: [0.001, 0.001, 0.001], translation: [5, 0, 0] }],
		scenes: [{ nodes: [0] }],
		scene: 0
	}, bin);
}

describe("quantised glTF (KHR_mesh_quantization)", () => {
	it("reads strided integer attributes, with the node transform dequantising positions", async () => {
		const model = await new IgeGltfLoader().parse(quantisedQuad(), "quad");
		const [part] = getModelParts(model);
		const g = part.geometryData;
		// The arrays as the file means them before its node transform: shorts as they are, normalized ones 0-1
		expect(Array.from(g.vertices!)).toEqual([-1000, 0, -1000, 1000, 0, -1000, 1000, 2000, 1000, -1000, 2000, 1000]);
		expect(Array.from(g.normals!.slice(0, 3))).toEqual([0, 1, 0]);
		expect(Array.from(g.uvs!)).toEqual([0, 1, 1, 1, 1, 0, 0, 0]);
		// Through the node: metres
		const m = part.matrix!;
		const x = (i: number) => m[0] * g.vertices![i * 3] + m[12];
		const y = (i: number) => m[5] * g.vertices![i * 3 + 1] + m[13];
		expect(x(1)).toBeCloseTo(6);
		expect(y(2)).toBeCloseTo(2);
		// The texture transform and sampler reach the material
		expect(part.materialData.uvScale).toEqual({ u: 0.5, v: 0.25 });
		expect(part.materialData.uvOffset).toEqual({ u: 0.25, v: 0.5 });
		expect(part.materialData.textureSampler).toMatchObject({ minFilter: 9729, magFilter: 9729 });
	});

	it("keeps the integers as they were stored on the GPU (16 bytes a vertex, not 32)", async () => {
		const model = await new IgeGltfLoader().parse(quantisedQuad(), "quad2");
		const g = getModelParts(model)[0].geometryData;
		expect(g.vertexEncodings).toEqual({ position: "snorm16", positionDecode: { scale: 32767, offset: [0, 0, 0] }, normal: "snorm8", uv: "unorm16" });
		const packed = packVertices(g, g.vertexEncodings);
		expect(packed.stride).toBe(16);
		const i16 = new Int16Array(packed.data), u16 = new Uint16Array(packed.data), i8 = new Int8Array(packed.data);
		// Exactly the file's shorts, bytes and unsigned shorts
		expect([i16[8], i16[9], i16[10]]).toEqual([1000, 0, -1000]);
		expect([i8[16 + 8], i8[16 + 9], i8[16 + 10]]).toEqual([0, 127, 0]);
		expect([u16[8 + 6], u16[8 + 7]]).toEqual([65535, 65535]);
		// The GPU reads snorm16 as stored / 32767; the decode puts the scale back, then the node's transform applies
		const d = positionDecodeMatrix(packed.positionDecode!);
		expect((i16[8] / 32767) * d[0]).toBeCloseTo(1000, 6);
		expect(unpackVertices(packed).vertices).toEqual(g.vertices);
	});

	it("keeps quantised attributes as floats when asked to (keepQuantised false)", async () => {
		const loader = new IgeGltfLoader();
		loader.keepQuantised = false;
		const model = await loader.parse(quantisedQuad(), "quad3");
		expect(getModelParts(model)[0].geometryData.vertexEncodings).toBeUndefined();
	});

	it("reads normalized byte positions and unnormalized texture coordinates", () => {
		class Loader extends IgeGltfLoader {
			encodings (gltf: any, attributes: Record<string, number>) {
				return this._vertexEncodings(gltf, attributes);
			}
		}
		const gltf = {
			accessors: [
				{ componentType: 5120, normalized: true, type: "VEC3", count: 1 },
				{ componentType: 5123, type: "VEC2", count: 1 },
				{ componentType: 5126, type: "VEC3", count: 1 }
			]
		};
		expect(new Loader().encodings(gltf, { POSITION: 0, TEXCOORD_0: 1, NORMAL: 2 })).toEqual({
			position: "snorm8", positionDecode: { scale: 1, offset: [0, 0, 0] },
			uv: "unorm16", uvDecode: { scale: [65535, 65535], offset: [0, 0] }
		});
		expect(new Loader().encodings({ accessors: [{ componentType: 5126, type: "VEC3", count: 1 }] }, { POSITION: 0 })).toBeUndefined();
		// Tangents stored as normalized bytes stay compact (the mesh keeps them when its material has a normal map)
		const tangents = { accessors: [{ componentType: 5126, type: "VEC3", count: 1 }, { componentType: 5120, normalized: true, type: "VEC4", count: 1 }] };
		expect(new Loader().encodings(tangents, { POSITION: 0, TANGENT: 1 })).toEqual({ tangent: "snorm8" });
	});

	it("reads sparse accessors and accessors with no buffer view", () => {
		class Loader extends IgeGltfLoader {
			read (gltf: any, index: number, buffers: ArrayBuffer[]) {
				return this._readAccessorData(gltf, index, buffers);
			}
		}
		const bin = new Uint8Array(16);
		const v = new DataView(bin.buffer);
		v.setUint16(0, 2, true); // sparse index 2
		v.setFloat32(4, 7, true); // its value (x, y, z)
		v.setFloat32(8, 8, true);
		v.setFloat32(12, 9, true);
		const gltf = {
			bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 2 }, { buffer: 0, byteOffset: 4, byteLength: 12 }],
			accessors: [{
				componentType: 5126, type: "VEC3", count: 3,
				sparse: { count: 1, indices: { bufferView: 0, componentType: 5123 }, values: { bufferView: 1 } }
			}]
		};
		expect(Array.from(new Loader().read(gltf, 0, [bin.buffer]))).toEqual([0, 0, 0, 0, 0, 0, 7, 8, 9]);
	});
});

/** A stand-in WebGL 2 context recording buffer uploads. */
function recordingGl (calls: { fn: string; args: unknown[] }[]): WebGL2RenderingContext {
	let n = 0;
	return new Proxy({}, {
		get: (_t, prop: string) => {
			if (/^[A-Z0-9_]+$/.test(prop)) return 1;
			if (prop === "checkFramebufferStatus") return () => 1;
			if (prop === "getExtension") return () => ({});
			if (prop === "getParameter") return () => 4096;
			if (prop.startsWith("create")) return () => ({ token: ++n });
			return (...args: unknown[]) => {
				calls.push({ fn: prop, args });
			};
		}
	}) as unknown as WebGL2RenderingContext;
}

describe("packed geometry on the GPU", () => {
	it("uploads a worker's packed mesh as it is, in its compact formats, and counts its bytes", async () => {
		const calls: { fn: string; args: unknown[] }[] = [];
		const gl = recordingGl(calls);
		const device = new IgeWebGl2GpuDevice(gl);
		const manager = new IgeWebGlGeometryManager(gl, {} as any, device);
		const before = device.memory().geometry; // the sprites' shared quad
		const model = await new IgeGltfLoader().parse(quantisedQuad(), "quad4");
		const data = getModelParts(model)[0].geometryData;
		const worker = { ...data, id: "fromWorker", packed: packVertices(data, data.vertexEncodings) };
		delete worker.vertices;
		calls.length = 0;
		const geometry = manager.createGeometryFromData("fromWorker", worker)!;
		// One bufferData for the vertices, with the worker's own bytes (no repacking, no second write)
		const uploads = calls.filter((c) => c.fn === "bufferData" || c.fn === "bufferSubData");
		expect(uploads).toHaveLength(2);
		expect((uploads[0].args[1] as Uint8Array).buffer).toBe(worker.packed.data);
		expect(geometry.gpuBytes).toBe(4 * 16 + 12);
		expect(device.memory().geometry - before).toBe(4 * 16 + 12);
		expect(meshLayout(geometry).layout.attributes.map((a) => a.format)).toEqual(["snorm16x4", "snorm8x4", "unorm16x2"]);
		expect(meshLayout(geometry).layout.arrayStride).toBe(16);
		expect(Array.from(geometry.positionDecode!)).toEqual([32767, 0, 0, 0, 0, 32767, 0, 0, 0, 0, 32767, 0, 0, 0, 0, 1]);
		// Bounds in the mesh's own units (the decode isn't in them)
		expect(geometry.boundsCenterY).toBeCloseTo(1000, 0);
		manager.deleteGeometry("fromWorker");
		expect(device.memory().geometry).toBe(before);
	});

	it("gives a mesh with tangents an a_tangent attribute, so its normal map is used", () => {
		const gl = recordingGl([]);
		const manager = new IgeWebGlGeometryManager(gl, {} as any, new IgeWebGl2GpuDevice(gl));
		const quad = {
			vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]),
			normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
			uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
			tangents: new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]),
			indices: new Uint16Array([0, 1, 2, 0, 2, 3])
		};
		const floats = manager.createGeometryFromData("tangentFloats", { id: "tangentFloats", ...quad })!;
		expect(floats.hasTangents).toBe(true);
		expect(floats.attributes.find((a) => a.name === "a_tangent")).toMatchObject({ size: 4, offset: 32, stride: 48 });
		const compact = manager.createGeometryFromData("tangentCompact", { id: "tangentCompact", ...quad, vertexEncodings: IGE_QUANTISED_ENCODINGS })!;
		expect(compact.hasTangents).toBe(true);
		expect(meshLayout(compact).layout.attributes.map((a) => a.format)).toEqual(["snorm16x4", "snorm8x4", "unorm16x2", "snorm8x4"]);
		const plain = manager.createGeometryFromData("noTangents", { id: "noTangents", ...quad, tangents: undefined })!;
		expect(plain.hasTangents).toBe(false);
	});
});
