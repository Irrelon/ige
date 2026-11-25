import {
	geometryGpuBytes,
	geometryTransferables,
	IGE_QUANTISED_ENCODINGS,
	packVertices,
	positionDecodeMatrix,
	quantiseGeometry,
	unpackVertices
} from "@/engine/webgl/IgeVertexPacking";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/** A box from (x0, y0, z0) to (x1, y1, z1): 24 vertices with face normals and 0-1 texture coordinates. */
function box (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): IgeGeometryData3d {
	const faces = [
		{ n: [1, 0, 0], c: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
		{ n: [-1, 0, 0], c: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
		{ n: [0, 1, 0], c: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] },
		{ n: [0, -1, 0], c: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
		{ n: [0, 0, 1], c: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
		{ n: [0, 0, -1], c: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] }
	];
	const vertices: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
	for (const f of faces) {
		const base = vertices.length / 3;
		f.c.forEach((p, i) => {
			vertices.push(...p);
			normals.push(...f.n);
			uvs.push(i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0);
		});
		indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
	}
	return { id: "box", vertices: new Float32Array(vertices), normals: new Float32Array(normals), uvs: new Float32Array(uvs), indices: new Uint16Array(indices) };
}

/** The interleaving the renderer did before packing existed (IgeWebGlGeometryManager), for comparison. */
function oldInterleave (d: IgeGeometryData3d): Float32Array {
	const n = d.vertices!.length / 3;
	const colorSize = d.colors ? Math.round(d.colors.length / n) : 0;
	const out: number[] = [];
	for (let i = 0; i < n; i++) {
		out.push(d.vertices![i * 3], d.vertices![i * 3 + 1], d.vertices![i * 3 + 2]);
		if (d.normals) out.push(d.normals[i * 3], d.normals[i * 3 + 1], d.normals[i * 3 + 2]);
		if (d.uvs) out.push(d.uvs[i * 2], d.uvs[i * 2 + 1]);
		if (colorSize) out.push(d.colors![i * colorSize], d.colors![i * colorSize + 1], d.colors![i * colorSize + 2], colorSize === 4 ? d.colors![i * colorSize + 3] : 1);
		if (d.boneWeights) out.push(...Array.from(d.boneWeights.subarray(i * 4, i * 4 + 4)));
		if (d.boneIndices) out.push(...Array.from(d.boneIndices.subarray(i * 4, i * 4 + 4)));
		if (d.tangents && d.tangents.length === n * 4) out.push(...Array.from(d.tangents.subarray(i * 4, i * 4 + 4)));
	}
	return new Float32Array(out);
}

describe("packVertices", () => {
	it("packs float32 meshes exactly as the renderer always interleaved them", () => {
		const mesh = box(-1, 0, -2, 3, 5, 2);
		mesh.colors = new Float32Array(24 * 3).map((_, i) => (i % 7) / 7); // RGB: alpha 1 added
		mesh.boneWeights = new Float32Array(24 * 4).fill(0.25);
		mesh.boneIndices = new Uint8Array(24 * 4).map((_, i) => i % 5);
		const packed = packVertices(mesh);
		expect(packed.stride).toBe((3 + 3 + 2 + 4 + 4 + 4) * 4);
		expect(packed.count).toBe(24);
		expect(packed.attributes.map((a) => `${a.name}:${a.format}@${a.offset}`)).toEqual([
			"position:float32x3@0", "normal:float32x3@12", "uv:float32x2@24", "color:float32x4@32", "boneWeights:float32x4@48", "boneIndices:float32x4@64"
		]);
		expect(new Float32Array(packed.data)).toEqual(oldInterleave(mesh));
		expect(packed.positionDecode).toBeUndefined();
	});

	it("quantises a mesh to 16 bytes a vertex and decodes back within the stored precision", () => {
		const mesh = box(-32, 0, -32, 32, 25, 32); // a 64 m chunk's extent
		const packed = packVertices(mesh, IGE_QUANTISED_ENCODINGS);
		expect(packed.stride).toBe(16);
		expect(packed.attributes.map((a) => `${a.name}:${a.format}@${a.offset}`)).toEqual(["position:snorm16x4@0", "normal:snorm8x4@8", "uv:unorm16x2@12"]);
		// One scale for every axis (normals stay right), centred on the bounds
		expect(packed.positionDecode).toEqual({ scale: 32, offset: [0, 12.5, 0] });
		expect(packed.uvDecode).toBeUndefined(); // 0-1 fits unorm16 as it is

		const back = unpackVertices(packed);
		const step = 64 / 65534;
		for (let i = 0; i < mesh.vertices!.length; i++) expect(Math.abs(back.vertices[i] - mesh.vertices![i])).toBeLessThanOrEqual(step / 2 + 1e-6);
		for (let i = 0; i < mesh.normals!.length; i++) expect(Math.abs(back.normals![i] - mesh.normals![i])).toBeLessThan(1 / 127);
		for (let i = 0; i < mesh.uvs!.length; i++) expect(Math.abs(back.uvs![i] - mesh.uvs![i])).toBeLessThan(1 / 65535);
	});

	it("decodes on the GPU's terms: stored / 32767, then the decode matrix", () => {
		const mesh = box(10, 20, 30, 14, 22, 31);
		const packed = packVertices(mesh, { position: "snorm16" });
		const i16 = new Int16Array(packed.data);
		const m = positionDecodeMatrix(packed.positionDecode!);
		// The first vertex as the GPU sees it, through the matrix
		const sx = i16[0] / 32767, sy = i16[1] / 32767, sz = i16[2] / 32767;
		const x = m[0] * sx + m[12], y = m[5] * sy + m[13], z = m[10] * sz + m[14];
		expect(x).toBeCloseTo(mesh.vertices![0], 3);
		expect(y).toBeCloseTo(mesh.vertices![1], 3);
		expect(z).toBeCloseTo(mesh.vertices![2], 3);
		expect(i16[3]).toBe(0); // padding
	});

	it("fits tiling texture coordinates (outside 0-1) with a decode", () => {
		const mesh = box(0, 0, 0, 1, 1, 1);
		mesh.uvs = mesh.uvs!.map((v) => v * 40 - 3); // a pavement repeating 40 times
		const packed = packVertices(mesh, IGE_QUANTISED_ENCODINGS);
		expect(packed.uvDecode).toEqual({ scale: [40, 40], offset: [-3, -3] });
		const back = unpackVertices(packed);
		for (let i = 0; i < mesh.uvs.length; i++) expect(back.uvs![i]).toBeCloseTo(mesh.uvs[i], 3);
	});

	it("packs tangents last, as the renderer interleaved them, only when every vertex has one", () => {
		const mesh = box(-1, 0, -2, 3, 5, 2);
		mesh.boneWeights = new Float32Array(24 * 4).fill(0.25);
		mesh.boneIndices = new Uint8Array(24 * 4).map((_, i) => i % 5);
		mesh.tangents = new Float32Array(24 * 4).map((_, i) => (i % 4 === 3 ? (i % 8 === 3 ? 1 : -1) : (i % 4) / 4));
		const packed = packVertices(mesh);
		expect(packed.stride).toBe((3 + 3 + 2 + 4 + 4 + 4) * 4);
		expect(packed.attributes.map((a) => `${a.name}:${a.format}@${a.offset}`).slice(-2)).toEqual(["boneIndices:float32x4@48", "tangent:float32x4@64"]);
		expect(new Float32Array(packed.data)).toEqual(oldInterleave(mesh));
		expect(geometryGpuBytes(mesh)).toBe(packed.data.byteLength + mesh.indices!.byteLength);
		// Not four for every vertex: left out
		const short = { ...box(0, 0, 0, 1, 1, 1), tangents: new Float32Array(24 * 3) };
		expect(packVertices(short).attributes.map((a) => a.name)).toEqual(["position", "normal", "uv"]);
	});

	it("quantises tangents to 4 bytes, handedness exact", () => {
		const mesh = box(-32, 0, -32, 32, 25, 32);
		const tangents = new Float32Array(24 * 4);
		for (let i = 0; i < 24; i++) {
			const a = i * 0.3;
			tangents.set([Math.cos(a), 0, Math.sin(a), i % 2 ? 1 : -1], i * 4);
		}
		mesh.tangents = tangents;
		const packed = packVertices(mesh, IGE_QUANTISED_ENCODINGS);
		expect(packed.stride).toBe(20);
		expect(packed.attributes.map((a) => `${a.name}:${a.format}@${a.offset}`)).toEqual(["position:snorm16x4@0", "normal:snorm8x4@8", "uv:unorm16x2@12", "tangent:snorm8x4@16"]);
		const back = unpackVertices(packed);
		for (let i = 0; i < tangents.length; i++) {
			if (i % 4 === 3) expect(back.tangents![i]).toBe(tangents[i]);
			else expect(Math.abs(back.tangents![i] - tangents[i])).toBeLessThan(1 / 127);
		}
		expect(geometryGpuBytes({ ...mesh, vertexEncodings: IGE_QUANTISED_ENCODINGS })).toBe(24 * 20 + 36 * 2);
	});

	it("keeps float32 positions on skinned meshes that would need a decode", () => {
		const mesh = box(-1, 0, -1, 1, 2, 1);
		mesh.boneWeights = new Float32Array(24 * 4).fill(0.25);
		mesh.boneIndices = new Uint8Array(24 * 4);
		const packed = packVertices(mesh, IGE_QUANTISED_ENCODINGS);
		expect(packed.attributes.find((a) => a.name === "position")!.format).toBe("float32x3");
		expect(packed.attributes.find((a) => a.name === "boneWeights")!.format).toBe("unorm16x4");
		expect(packed.positionDecode).toBeUndefined();
		// Already in range with no decode (a quantised glTF's normalized positions): kept compact
		const normalized = { ...mesh, vertices: mesh.vertices!.map((v) => v / 2) };
		const compact = packVertices(normalized, { position: "snorm16", positionDecode: { scale: 1, offset: [0, 0, 0] } });
		expect(compact.attributes[0].format).toBe("snorm16x4");
	});
});

describe("quantiseGeometry", () => {
	it("halves a block's GPU memory and keeps its bounds in its own units", () => {
		const mesh = box(-5, 0, -4, 5, 18, 4);
		const floatBytes = geometryGpuBytes(mesh);
		const compact = quantiseGeometry(mesh);
		const compactBytes = geometryGpuBytes(compact);
		expect(floatBytes).toBe(24 * 32 + 36 * 2);
		expect(compactBytes).toBe(24 * 16 + 36 * 2);
		expect(compact.vertices).toBeUndefined();
		expect(compact.indices).toBe(mesh.indices);
		expect(compact.boundingBox).toEqual({ min: [-5, 0, -4], max: [5, 18, 4] });
		expect(compact.boundingSphere!.center).toEqual([0, 9, 0]);
		expect(quantiseGeometry(mesh, IGE_QUANTISED_ENCODINGS, { keepArrays: true }).vertices).toBe(mesh.vertices);
	});

	it("lists the buffers a worker can transfer", () => {
		const compact = quantiseGeometry(box(0, 0, 0, 1, 1, 1));
		const list = geometryTransferables(compact);
		expect(list).toContain(compact.packed!.data);
		expect(list).toContain(compact.indices!.buffer);
		expect(list).toHaveLength(2);
	});
});
