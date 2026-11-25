/**
 * The town the example streams: generated from a seed, so the worker and the main thread build the same chunks.
 * Pieces come from a small glTF file written here in code (KHR_mesh_quantization: positions as 16-bit integers with
 * the node's scale turning them back into metres, normals as bytes, texture coordinates as 16-bit), as a pack of
 * art would ship. Nothing here touches the engine's runtime or the DOM, so the worker imports it too.
 */
import { type IgeMergedGeometry, type IgeMergePiece, type IgeMergeSource, mergeGeometry } from "@/engine/webgl/IgeGeometryMerge";
import type { IgeVertexEncodings } from "@/engine/webgl/IgeVertexPacking";

/** Metres along each side of a chunk. */
export const CHUNK_SIZE = 64;
/** Chunks along each side of the town (centred on the origin). */
export const WORLD_CHUNKS = 16;
/** Metres from the town's middle to its edge. */
export const WORLD_HALF = (CHUNK_SIZE * WORLD_CHUNKS) / 2;
/** A street running east to west (along x) at this z, and one north to south at this x: no blocks on them. */
export const STREET_Z = -200;
export const STREET_X = 452;

/** Cells of the 2 × 2 texture atlas: where each one's texture coordinates go (scale, offset). */
export const ATLAS_CELLS = {
	brick: { scale: [0.5, 0.5] as [number, number], offset: [0, 0] as [number, number] },
	render: { scale: [0.5, 0.5] as [number, number], offset: [0.5, 0] as [number, number] },
	glass: { scale: [0.5, 0.5] as [number, number], offset: [0, 0.5] as [number, number] },
	roof: { scale: [0.5, 0.5] as [number, number], offset: [0.5, 0.5] as [number, number] }
};

/** A piece as the worker gets it: its arrays as loaded, and its node's matrix (which dequantises its positions). */
export interface BlockPiece {
	mesh: IgeMergeSource;
	matrix?: number[];
}

export type BlockLibrary = Record<string, BlockPiece>;

/** How a chunk's meshes come back: packed and quantised, packed as floats, or plain float arrays (packed on the main thread). */
export type ChunkFormat = "quantised" | "packed" | "arrays";

export interface BuiltChunk {
	key: string;
	cx: number;
	cz: number;
	/** One mesh per material ("atlas", "paving"), positions relative to the chunk's middle. */
	meshes: IgeMergedGeometry[];
	blocks: number;
	triangles: number;
	/** Milliseconds building it (merging and packing). */
	ms: number;
}

/** A small, fast seeded random number generator (mulberry32). */
export function random (seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Column-major matrix: scale, then move. */
function place (x: number, y: number, z: number, sx: number, sy: number, sz: number): number[] {
	return [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, x, y, z, 1];
}

/** a × b, column-major. */
function mul (a: number[], b: number[]): number[] {
	const out = new Array(16).fill(0);
	for (let c = 0; c < 4; c++) {
		for (let r = 0; r < 4; r++) {
			out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
		}
	}
	return out;
}

const TINTS: [number, number, number][] = [
	[0.95, 0.86, 0.78], [0.82, 0.74, 0.7], [0.9, 0.9, 0.86], [0.76, 0.8, 0.86], [0.96, 0.92, 0.8], [0.7, 0.66, 0.62]
];

/**
 * A chunk's pieces: 8 × 8 plots of 8 m, most with a block (a body, windows on every floor and side, a roof), taller
 * towards the middle of town; and the paving under them.
 */
export function chunkPieces (cx: number, cz: number, lib: BlockLibrary): { pieces: IgeMergePiece[]; blocks: number } {
	const rnd = random((cx * 73856093) ^ (cz * 19349663) ^ 1066);
	const cube = lib.block;
	const pieces: IgeMergePiece[] = [];
	const x0 = cx * CHUNK_SIZE - WORLD_HALF, z0 = cz * CHUNK_SIZE - WORLD_HALF;
	const mid = CHUNK_SIZE / 2;
	let blocks = 0;
	const add = (m: number[], cell: keyof typeof ATLAS_CELLS, color: [number, number, number]) => {
		pieces.push({ geometry: cube.mesh, matrix: cube.matrix ? mul(m, cube.matrix) : m, material: "atlas", uvTransform: ATLAS_CELLS[cell], color });
	};
	for (let i = 0; i < 8; i++) {
		for (let j = 0; j < 8; j++) {
			if (rnd() < 0.1) continue; // a gap: a yard or a square
			// Plot centre, relative to the chunk's middle
			const px = i * 8 + 4 - mid, pz = j * 8 + 4 - mid;
			const wx = x0 + i * 8 + 4, wz = z0 + j * 8 + 4;
			// The streets the example's camera flies along
			if (Math.abs(wz - STREET_Z) < 6 || Math.abs(wx - STREET_X) < 6) continue;
			const downtown = Math.max(0, 1 - Math.hypot(wx, wz) / (WORLD_HALF * 0.9));
			const w = 5 + rnd() * 2, d = 5 + rnd() * 2;
			const h = 4 + rnd() * (8 + 30 * downtown * downtown);
			const tint = TINTS[Math.floor(rnd() * TINTS.length)];
			const style = rnd() < 0.5 ? "brick" : "render";
			add(place(px, 0, pz, w, h, d), style, tint);
			add(place(px, h, pz, w + 0.4, 0.4, d + 0.4), "roof", [0.55, 0.55, 0.58]);
			// Windows: every floor (3.2 m), along each side
			const glass: [number, number, number] = [0.45, 0.55, 0.7];
			for (let y = 1.2; y + 1.6 < h; y += 3.2) {
				for (const side of [0, 1, 2, 3]) {
					const along = side < 2 ? w : d, n = Math.max(1, Math.floor(along / 2.6));
					for (let k = 0; k < n; k++) {
						const t = (k + 0.5) / n - 0.5;
						if (side === 0) add(place(px + t * w, y, pz + d / 2 + 0.05, 1.2, 1.5, 0.12), "glass", glass);
						else if (side === 1) add(place(px + t * w, y, pz - d / 2 - 0.05, 1.2, 1.5, 0.12), "glass", glass);
						else if (side === 2) add(place(px + w / 2 + 0.05, y, pz + t * d, 0.12, 1.5, 1.2), "glass", glass);
						else add(place(px - w / 2 - 0.05, y, pz + t * d, 0.12, 1.5, 1.2), "glass", glass);
					}
				}
			}
			blocks++;
		}
	}
	pieces.push({ geometry: pavingMesh(), material: "paving" });
	return { pieces, blocks };
}

/** The chunk's paving: 8 × 8 squares of 8 m, texture coordinates repeating every 2 m (64 m → 0 to 32). */
function pavingMesh (): IgeMergeSource {
	const n = 8, step = CHUNK_SIZE / n, half = CHUNK_SIZE / 2;
	const vertices: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
	for (let j = 0; j <= n; j++) {
		for (let i = 0; i <= n; i++) {
			vertices.push(i * step - half, 0, j * step - half);
			normals.push(0, 1, 0);
			uvs.push((i * step) / 2, (j * step) / 2);
		}
	}
	for (let j = 0; j < n; j++) {
		for (let i = 0; i < n; i++) {
			const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
			indices.push(a, c, b, b, c, d);
		}
	}
	return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), uvs: new Float32Array(uvs), indices: new Uint16Array(indices) };
}

/** Builds a chunk: its pieces merged into one mesh per material, packed as asked. */
export function buildChunk (cx: number, cz: number, lib: BlockLibrary, format: ChunkFormat, encodings: IgeVertexEncodings): BuiltChunk {
	const t0 = performance.now();
	const { pieces, blocks } = chunkPieces(cx, cz, lib);
	const key = `${cx}_${cz}`;
	const meshes = mergeGeometry(pieces, { id: `chunk_${key}`, pack: format === "arrays" ? undefined : format === "quantised" ? encodings : {} });
	let triangles = 0;
	for (const m of meshes) triangles += m.triangles;
	return { key, cx, cz, meshes, blocks, triangles, ms: performance.now() - t0 };
}

// ---------------------------------------------------------------- the pieces, as a quantised glTF

/** A unit block: x and z from -0.5 to 0.5, y from 0 to 1, a 0-1 texture square on each face. */
function unitBlock (): { positions: number[]; normals: number[]; uvs: number[]; indices: number[] } {
	const faces = [
		{ n: [1, 0, 0], c: [[0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5]] },
		{ n: [-1, 0, 0], c: [[-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5]] },
		{ n: [0, 1, 0], c: [[-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5]] },
		{ n: [0, -1, 0], c: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]] },
		{ n: [0, 0, 1], c: [[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]] },
		{ n: [0, 0, -1], c: [[0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5]] }
	];
	const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
	for (const f of faces) {
		const base = positions.length / 3;
		f.c.forEach((p, i) => {
			positions.push(...p);
			normals.push(...f.n);
			uvs.push(i === 1 || i === 2 ? 1 : 0, i >= 2 ? 0 : 1);
		});
		indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
	}
	return { positions, normals, uvs, indices };
}

/**
 * The pieces as a GLB, quantised the way gltfpack writes them (KHR_mesh_quantization): positions as shorts padded to
 * 8 bytes with the node's scale (1/16384) making metres of them, normals as normalized bytes padded to 4, texture
 * coordinates as normalized unsigned shorts. One material on the atlas (its PNG embedded), with a sampler asking for
 * mipmaps.
 */
export function pieceLibraryGlb (atlasPng: Uint8Array): ArrayBuffer {
	const QUANT = 16384;
	const b = unitBlock();
	const n = b.positions.length / 3;
	const posBytes = n * 8, nrmBytes = n * 4, uvBytes = n * 4, idxBytes = b.indices.length * 2;
	const imgAt = Math.ceil((posBytes + nrmBytes + uvBytes + idxBytes) / 4) * 4;
	const bin = new Uint8Array(Math.ceil((imgAt + atlasPng.length) / 4) * 4);
	const v = new DataView(bin.buffer);
	for (let i = 0; i < n; i++) {
		for (let k = 0; k < 3; k++) v.setInt16(i * 8 + k * 2, Math.round(b.positions[i * 3 + k] * QUANT), true);
		for (let k = 0; k < 3; k++) v.setInt8(posBytes + i * 4 + k, Math.round(b.normals[i * 3 + k] * 127));
		for (let k = 0; k < 2; k++) v.setUint16(posBytes + nrmBytes + i * 4 + k * 2, Math.round(b.uvs[i * 2 + k] * 65535), true);
	}
	b.indices.forEach((x, i) => v.setUint16(posBytes + nrmBytes + uvBytes + i * 2, x, true));
	bin.set(atlasPng, imgAt);
	const json = {
		asset: { version: "2.0", generator: "IGE geometryStreaming example" },
		extensionsUsed: ["KHR_mesh_quantization"],
		extensionsRequired: ["KHR_mesh_quantization"],
		buffers: [{ byteLength: bin.length }],
		bufferViews: [
			{ buffer: 0, byteOffset: 0, byteLength: posBytes, byteStride: 8, target: 34962 },
			{ buffer: 0, byteOffset: posBytes, byteLength: nrmBytes, byteStride: 4, target: 34962 },
			{ buffer: 0, byteOffset: posBytes + nrmBytes, byteLength: uvBytes, byteStride: 4, target: 34962 },
			{ buffer: 0, byteOffset: posBytes + nrmBytes + uvBytes, byteLength: idxBytes, target: 34963 },
			{ buffer: 0, byteOffset: imgAt, byteLength: atlasPng.length }
		],
		accessors: [
			{ bufferView: 0, componentType: 5122, count: n, type: "VEC3", min: [-QUANT / 2, 0, -QUANT / 2], max: [QUANT / 2, QUANT, QUANT / 2] },
			{ bufferView: 1, componentType: 5120, normalized: true, count: n, type: "VEC3" },
			{ bufferView: 2, componentType: 5123, normalized: true, count: n, type: "VEC2" },
			{ bufferView: 3, componentType: 5123, count: b.indices.length, type: "SCALAR" }
		],
		images: [{ bufferView: 4, mimeType: "image/png" }],
		samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
		textures: [{ source: 0, sampler: 0 }],
		materials: [{ name: "atlas", pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.9 } }],
		meshes: [{ name: "block", primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
		nodes: [{ name: "block", mesh: 0, scale: [1 / QUANT, 1 / QUANT, 1 / QUANT] }],
		scenes: [{ nodes: [0] }],
		scene: 0
	};
	return glb(json, bin);
}

/** A GLB file: the JSON chunk, then the binary one. */
function glb (json: object, bin: Uint8Array): ArrayBuffer {
	const text = new TextEncoder().encode(JSON.stringify(json));
	const jsonLen = Math.ceil(text.length / 4) * 4;
	const out = new ArrayBuffer(12 + 8 + jsonLen + 8 + bin.length);
	const v = new DataView(out), u8 = new Uint8Array(out);
	v.setUint32(0, 0x46546c67, true);
	v.setUint32(4, 2, true);
	v.setUint32(8, out.byteLength, true);
	v.setUint32(12, jsonLen, true);
	v.setUint32(16, 0x4e4f534a, true);
	u8.fill(0x20, 20, 20 + jsonLen);
	u8.set(text, 20);
	v.setUint32(20 + jsonLen, bin.length, true);
	v.setUint32(24 + jsonLen, 0x004e4942, true);
	u8.set(bin, 28 + jsonLen);
	return out;
}
