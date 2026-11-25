/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { readFileSync } from "fs";
import path from "path";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { IgeSkeletalAnimationComponent } from "@/engine/components/IgeSkeletalAnimationComponent";
import { type IgeGltfModel, IgeGltfLoader } from "@/engine/webgl/IgeGltfLoader";
import { igeDecodeMeshopt, igeMeshoptDecoder } from "@/engine/webgl/IgeMeshopt";
import { createSkeletonInstance, getModelParts, multiplyMat4, restBoneMatrices } from "@/engine/webgl/IgeModelParts";
import { IgeWebGlSkeletonManager } from "@/engine/webgl/IgeWebGlSkeletonManager";

// meshoptimizer's encoder, to write compressed files here (an ES module, which the test environment imports natively)
declare const igeNativeImport: (name: string) => Promise<any>;
let MeshoptEncoder: any;
beforeAll(async () => {
	({ MeshoptEncoder } = await igeNativeImport("meshoptimizer/encoder"));
});

type Compression = "EXT_meshopt_compression" | "KHR_meshopt_compression";

const pad4 = (n: number) => (n + 3) & ~3;

/** A GLB file: the JSON chunk, then the binary one (each padded to 4 bytes). */
function glb (json: object, bin: Uint8Array): ArrayBuffer {
	const text = new TextEncoder().encode(JSON.stringify(json));
	const jsonLen = pad4(text.length), binLen = pad4(bin.length);
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

/** Byte arrays one after another, each from a multiple of 4; and where each starts. */
function concat (parts: Uint8Array[]): { bytes: Uint8Array; offsets: number[] } {
	const offsets: number[] = [];
	let length = 0;
	for (const p of parts) {
		offsets.push(length);
		length = pad4(length + p.length);
	}
	const bytes = new Uint8Array(length);
	parts.forEach((p, i) => bytes.set(p, offsets[i]));
	return { bytes, offsets };
}

/**
 * A quantised quad's streams as gltfpack writes them: positions as shorts padded to 8 bytes, normals as bytes padded
 * to 4, texture coordinates as normalised unsigned shorts, 16-bit indices.
 */
function quadStreams () {
	const positions = new Int16Array([-1000, 0, -1000, 0, 1000, 0, -1000, 0, 1000, 2000, 1000, 0, -1000, 2000, 1000, 0]);
	const normals = new Int8Array([0, 127, 0, 0, 0, 127, 0, 0, 0, 127, 0, 0, 0, 127, 0, 0]);
	const uvs = new Uint16Array([0, 65535, 65535, 65535, 65535, 0, 0, 0]);
	const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
	const bytes = (a: ArrayBufferView) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
	return [
		{ data: bytes(positions), count: 4, stride: 8, mode: "ATTRIBUTES", filter: "NONE" },
		{ data: bytes(normals), count: 4, stride: 4, mode: "ATTRIBUTES", filter: "NONE" },
		{ data: bytes(uvs), count: 4, stride: 4, mode: "ATTRIBUTES", filter: "NONE" },
		{ data: bytes(indices), count: 6, stride: 2, mode: "TRIANGLES", filter: "NONE" }
	];
}

/** The quad's glTF, its views 0-3 the streams above (and 4 the image) at `views`. */
function quadJson (views: object[], buffers: object[], extensions: string[] = []): any {
	return {
		asset: { version: "2.0" },
		extensionsUsed: ["KHR_mesh_quantization", "KHR_texture_transform", ...extensions],
		extensionsRequired: ["KHR_mesh_quantization", ...extensions],
		buffers,
		bufferViews: views,
		accessors: [
			{ bufferView: 0, componentType: 5122, count: 4, type: "VEC3", min: [-1000, 0, -1000], max: [1000, 2000, 1000] },
			{ bufferView: 1, componentType: 5120, normalized: true, count: 4, type: "VEC3" },
			{ bufferView: 2, componentType: 5123, normalized: true, count: 4, type: "VEC2" },
			{ bufferView: 3, componentType: 5123, count: 6, type: "SCALAR" }
		],
		images: [{ bufferView: 4, mimeType: "image/png" }],
		textures: [{ source: 0 }],
		materials: [{
			pbrMetallicRoughness: {
				baseColorTexture: { index: 0, extensions: { KHR_texture_transform: { offset: [0.25, 0.5], scale: [0.5, 0.25] } } }
			}
		}],
		meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
		nodes: [{ name: "Quad", children: [1] }, { mesh: 0, scale: [0.001, 0.001, 0.001], translation: [5, 0, 0] }],
		scenes: [{ nodes: [0] }],
		scene: 0
	};
}

const IMAGE = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

/** The quad as a plain quantised GLB. */
function plainQuad (): ArrayBuffer {
	const streams = quadStreams();
	const { bytes, offsets } = concat([...streams.map((s) => s.data), IMAGE]);
	const views = [...streams.map((s, i) => ({
		buffer: 0, byteOffset: offsets[i], byteLength: s.data.length, ...(s.mode === "ATTRIBUTES" ? { byteStride: s.stride } : {})
	})), { buffer: 0, byteOffset: offsets[4], byteLength: IMAGE.length }];
	return glb(quadJson(views, [{ byteLength: bytes.length }]), bytes);
}

/**
 * The quad meshopt-compressed as gltfpack -c lays it out: the compressed streams and the image in the binary chunk
 * (buffer 0), the views pointing into an empty fallback buffer (1). `edit` changes a stream's compressed bytes or
 * its filter, to break it.
 */
async function compressedQuad (name: Compression, edit?: (stream: { compressed: Uint8Array; filter: string }, index: number) => void): Promise<{ json: any; bin: Uint8Array }> {
	await MeshoptEncoder.ready;
	// EXT files are version 0 of the vertex codec, as gltfpack writes them by default; KHR ones version 1 (gltfpack -ce khr)
	const version = name === "KHR_meshopt_compression" ? 1 : 0;
	const streams = quadStreams().map((s) => ({ ...s, compressed: MeshoptEncoder.encodeGltfBuffer(s.data, s.count, s.stride, s.mode, version) as Uint8Array }));
	streams.forEach((s, i) => edit?.(s, i));
	const { bytes, offsets } = concat([...streams.map((s) => s.compressed), IMAGE]);
	const decoded = concat(streams.map((s) => s.data));
	const views = [...streams.map((s, i) => ({
		buffer: 1, byteOffset: decoded.offsets[i], byteLength: s.data.length,
		...(s.mode === "ATTRIBUTES" ? { byteStride: s.stride } : {}),
		extensions: { [name]: { buffer: 0, byteOffset: offsets[i], byteLength: s.compressed.length, byteStride: s.stride, count: s.count, mode: s.mode, filter: s.filter } }
	})), { buffer: 0, byteOffset: offsets[4], byteLength: IMAGE.length }];
	const buffers = [{ byteLength: bytes.length }, { byteLength: decoded.bytes.length, extensions: { [name]: { fallback: true } } }];
	return { json: quadJson(views, buffers, [name]), bin: bytes };
}

/** What a loaded model's first part holds, to compare two files. */
function summary (model: IgeGltfModel) {
	const [part] = getModelParts(model);
	const g = part.geometryData;
	return {
		name: part.name,
		vertices: Array.from(g.vertices!),
		normals: Array.from(g.normals!),
		uvs: Array.from(g.uvs!),
		indices: Array.from(g.indices!),
		encodings: g.vertexEncodings,
		matrix: Array.from(part.matrix!),
		uvScale: part.materialData.uvScale,
		uvOffset: part.materialData.uvOffset
	};
}

describe("meshopt-compressed glTF (EXT_meshopt_compression, KHR_meshopt_compression)", () => {
	it("decodes the compressed buffer views into the same mesh as the uncompressed file", async () => {
		const plain = summary(await new IgeGltfLoader().parse(plainQuad(), "plainQuad"));
		const { json, bin } = await compressedQuad("EXT_meshopt_compression");
		const compressed = summary(await new IgeGltfLoader().parse(glb(json, bin), "extQuad"));
		expect(compressed).toEqual(plain);
		expect(plain.vertices.slice(3, 6)).toEqual([1000, 0, -1000]);
		expect(plain.indices).toEqual([0, 1, 2, 0, 2, 3]);
	});

	it("reads KHR_meshopt_compression, with version 1 of the vertex codec", async () => {
		const plain = summary(await new IgeGltfLoader().parse(plainQuad(), "plainQuad2"));
		const { json, bin } = await compressedQuad("KHR_meshopt_compression");
		expect(summary(await new IgeGltfLoader().parse(glb(json, bin), "khrQuad"))).toEqual(plain);
	});

	it("decodes filtered streams (octahedral normals)", async () => {
		const { json, bin } = await compressedQuad("EXT_meshopt_compression", (s, i) => {
			if (i !== 1) return;
			// Normals as gltfpack -cc writes them: octahedral, 8 bits
			const n = new Float32Array([0, 1, 0, 0, 0, 1, 0, 0, 0.6, 0.8, 0, 0, 0, 0, -1, 0]);
			s.compressed = MeshoptEncoder.encodeGltfBuffer(MeshoptEncoder.encodeFilterOct(n, 4, 4, 8), 4, 4, "ATTRIBUTES", 0);
			s.filter = "OCTAHEDRAL";
		});
		const normals = summary(await new IgeGltfLoader().parse(glb(json, bin), "octQuad")).normals;
		const expected = [0, 1, 0, 0, 1, 0, 0.6, 0.8, 0, 0, 0, -1];
		normals.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 1));
	});

	it("doesn't fetch a .gltf's fallback buffer: decoding fills it", async () => {
		const { json, bin } = await compressedQuad("EXT_meshopt_compression");
		json.buffers[0].uri = `data:application/octet-stream;base64,${Buffer.from(bin).toString("base64")}`;
		json.buffers[1].uri = "quad.fallback.bin";
		const fetched: string[] = [];
		const saved = (globalThis as any).fetch;
		(globalThis as any).fetch = (url: string) => {
			fetched.push(url);
			return Promise.reject(new Error("no network here"));
		};
		try {
			const model = await new IgeGltfLoader().parse(json, "gltfQuad", "models/");
			expect(summary(model).indices).toEqual([0, 1, 2, 0, 2, 3]);
		} finally {
			(globalThis as any).fetch = saved;
		}
		expect(fetched).toEqual([]);
	});

	it("says why it can't decode: a filter it doesn't know, a corrupt stream", async () => {
		const unknownFilter = await compressedQuad("KHR_meshopt_compression", (s, i) => {
			if (i === 0) s.filter = "SPIRAL";
		});
		await expect(new IgeGltfLoader().parse(glb(unknownFilter.json, unknownFilter.bin), "spiralQuad")).rejects.toThrow(/"SPIRAL" filter isn't supported/);
		const corrupt = await compressedQuad("KHR_meshopt_compression", (s, i) => {
			if (i === 0) s.compressed[0] = 0xaf;
		});
		await expect(new IgeGltfLoader().parse(glb(corrupt.json, corrupt.bin), "corruptQuad")).rejects.toThrow(/couldn't be decoded/);
	});

	it("decodes colour-filtered streams", async () => {
		const { json, bin } = await compressedQuad("KHR_meshopt_compression", (s, i) => {
			if (i !== 1) return;
			const c = new Uint8Array([0, 127, 0, 255, 0, 0, 127, 255, 0, 127, 0, 255, 0, 0, 127, 255]);
			s.compressed = MeshoptEncoder.encodeGltfBuffer(c, 4, 4, "ATTRIBUTES", 1);
			s.filter = "COLOR";
		});
		await expect(new IgeGltfLoader().parse(glb(json, bin), "colorQuad")).resolves.toBeDefined();
	});

	it("decodes in place, without the loader (for workers)", async () => {
		const { json, bin } = await compressedQuad("EXT_meshopt_compression");
		const buffers: (ArrayBuffer | undefined)[] = [bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength)];
		igeDecodeMeshopt(json, buffers, await igeMeshoptDecoder());
		expect(buffers[1]!.byteLength).toBe(json.buffers[1].byteLength);
		const view = json.bufferViews[3];
		expect(Array.from(new Uint16Array(buffers[1]!, view.byteOffset, 6))).toEqual([0, 1, 2, 0, 2, 3]);
	});
});

describe("part names", () => {
	it("come from the nearest named node above when a mesh's node and the mesh have no name (gltfpack -kn)", async () => {
		const model = await new IgeGltfLoader().parse(plainQuad(), "unnamedQuad");
		expect(getModelParts(model).map((p) => p.name)).toEqual(["Quad"]);
	});

	it("are still the node's, or else the mesh's, when they have one", async () => {
		const bin = new Uint8Array(plainQuad().slice(0));
		const json = JSON.parse(new TextDecoder().decode(bin.subarray(20, 20 + new DataView(bin.buffer).getUint32(12, true))));
		const binary = bin.subarray(28 + new DataView(bin.buffer).getUint32(12, true));
		json.meshes.push({ ...json.meshes[0], name: "Lid" });
		json.nodes = [
			{ name: "Crate", children: [1, 2] },
			{ name: "Body", mesh: 0 },
			{ mesh: 1 }
		];
		const model = await new IgeGltfLoader().parse(glb(json, binary), "namedQuads");
		expect(getModelParts(model).map((p) => p.name)).toEqual(["Body", "Lid"]);
	});
});

describe("gltfpack's own output", () => {
	// CesiumMan (src/assets/models), without its texture, packed by gltfpack 1.3:
	// gltfpack -i CesiumMan.glb -o CesiumMan.meshopt.glb -cc -kn -af 0
	// and, with the Khronos extension (and version 1 of the vertex codec):
	// gltfpack -i CesiumMan.glb -o CesiumMan.khr.glb -cc -ce khr -kn -af 0
	// (quantised, meshopt-compressed with octahedral normals, quaternion rotations and exponential translations)
	const load = (file: string, id: string) => {
		const bytes = readFileSync(file);
		return new IgeGltfLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), id);
	};
	const skeletonManager = new IgeWebGlSkeletonManager();
	beforeAll(() => {
		Object.defineProperty(ige, "engine", {
			value: { renderer: () => ({ classId: "IgeWebGlRenderer", frameId: () => 1, skeletonManager }) },
			configurable: true,
			writable: true
		});
	});

	/** The skinned mesh's corners in the rest pose (model space). */
	const restBounds = (model: IgeGltfModel) => {
		const part = getModelParts(model)[0];
		const skeleton = model.skins![0].skeleton;
		const rest = restBoneMatrices(skeleton);
		const skin = skeleton.bones.map((bone, i) => multiplyMat4(rest[i], bone.inverseBindMatrix));
		const g = part.geometryData;
		const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
		for (let v = 0; v < g.vertices!.length / 3; v++) {
			const p = [0, 0, 0];
			for (let k = 0; k < 4; k++) {
				const w = g.boneWeights![v * 4 + k], m = skin[g.boneIndices![v * 4 + k]];
				const [x, y, z] = [g.vertices![v * 3], g.vertices![v * 3 + 1], g.vertices![v * 3 + 2]];
				for (let c = 0; c < 3; c++) p[c] += w * (m[c] * x + m[4 + c] * y + m[8 + c] * z + m[12 + c]);
			}
			for (let c = 0; c < 3; c++) {
				lo[c] = Math.min(lo[c], p[c]);
				hi[c] = Math.max(hi[c], p[c]);
			}
		}
		return [...lo, ...hi];
	};

	/** Each bone's model-space matrix by name, `seconds` into the model's clip. */
	const pose = (model: IgeGltfModel, seconds: number) => {
		const entity = new IgeEntity();
		const anim = new IgeSkeletalAnimationComponent(entity);
		const skeleton = createSkeletonInstance(model.skins![0].skeleton);
		anim.setSkeleton(skeleton);
		entity._skeleton = skeleton;
		anim.define("clip", model.animations![0]);
		anim.play("clip", { crossFadeDuration: 0 });
		(anim as any)._update(entity, seconds * 1000);
		skeletonManager.updateSkeletonMatrices(skeleton);
		return new Map(skeleton.data.bones.map((bone, i) => [bone.name, skeleton.worldMatrices.slice(i * 16, i * 16 + 16)]));
	};

	it.each([["CesiumMan.meshopt.glb", "EXT_meshopt_compression"], ["CesiumMan.khr.glb", "KHR_meshopt_compression"]])("loads %s (%s) with its parts named, its mesh where it was and its animation as it was", async (file, extension) => {
		const original = await load(path.join(__dirname, "../assets/models/CesiumMan.glb"), "cesiumMan");
		const packed = await load(path.join(__dirname, "support", file), `cesiumMan-${file}`);
		expect(readFileSync(path.join(__dirname, "support", file)).includes(extension)).toBe(true);
		// The mesh's node has no name (gltfpack -kn): it's named after the node above
		expect(getModelParts(packed).map((p) => p.name)).toEqual(getModelParts(original).map((p) => p.name));
		// Within a millimetre (it's about 1.5 m tall) in the rest pose, after skinning
		const a = restBounds(original), b = restBounds(packed);
		expect(Math.max(a[3] - a[0], a[4] - a[1], a[5] - a[2])).toBeGreaterThan(1.4);
		a.forEach((value, i) => expect(Math.abs(b[i] - value)).toBeLessThan(0.001));
		// Every bone within a millimetre and a few thousandths of a radian, through the clip
		expect(packed.animations![0].duration).toBeCloseTo(original.animations![0].duration, 5);
		const moved = (m: Map<string, Float32Array>, n: Map<string, Float32Array>) => Math.max(...[...m].map(([name, x]) => Math.hypot(x[12] - n.get(name)![12], x[13] - n.get(name)![13], x[14] - n.get(name)![14])));
		expect(moved(pose(original, 0), pose(original, 1))).toBeGreaterThan(0.05);
		for (const seconds of [0, 0.37, 1, 1.63]) {
			const pa = pose(original, seconds), pb = pose(packed, seconds);
			expect([...pb.keys()].sort()).toEqual([...pa.keys()].sort());
			for (const [name, m] of pa) {
				const n = pb.get(name)!;
				for (const i of [12, 13, 14]) expect(Math.abs(n[i] - m[i])).toBeLessThan(0.001);
				for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) expect(Math.abs(n[i] - m[i])).toBeLessThan(0.005);
			}
		}
	});
});
