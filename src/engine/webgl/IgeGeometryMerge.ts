/**
 * Mesh merging (static batching): many placed pieces become one mesh per material, so a block of a city full of
 * buildings, props and road tiles is a draw or two instead of hundreds. Each piece's transform is applied to its
 * positions and normals (mirrored pieces keep their faces' winding), its indices offset, and its texture coordinates
 * and vertex colours kept. Plain typed-array work with no engine or DOM: it runs in a worker as well as on the main
 * thread, and can hand back meshes already packed (and quantised) for the renderer to upload as they are.
 *
 * @example #A street of houses as one mesh per material, quantised, in a worker
 *     const merged = mergeGeometry(houses.map((h) => ({ geometry: pieces[h.kind], matrix: h.matrix, material: "atlas" })),
 *         { id: `chunk_${key}`, pack: IGE_QUANTISED_ENCODINGS });
 *     postMessage(merged, merged.flatMap((m) => geometryTransferables(m.geometry)));
 */
import { type IgeVertexArrays, type IgeVertexEncodings, packVertices, unpackVertices, vertexBounds, type IgePackedVertices } from "@/engine/webgl/IgeVertexPacking";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/** A piece's mesh: float arrays (positions needed; normals, texture coordinates and colours if it has them), or a packed mesh. */
export interface IgeMergeSource extends IgeVertexArrays {
	indices?: ArrayLike<number>;
	packed?: IgePackedVertices;
}

/** One piece to merge. */
export interface IgeMergePiece {
	geometry: IgeMergeSource;
	/** Where the piece goes (column-major 4x4: translation in 12, 13, 14); as it is when not given. */
	matrix?: ArrayLike<number>;
	/**
	 * Pieces with the same material merge into one mesh. Any key: a name in a worker, the material object itself
	 * on the main thread. Pieces without one share a mesh.
	 */
	material?: unknown;
	/** The colour of each of its vertices when it has none of its own and the merged mesh has colours (white if not given). */
	color?: [number, number, number] | [number, number, number, number];
	/** Its texture coordinates moved: uv × scale + offset (into its cell of an atlas, say). */
	uvTransform?: { scale: [number, number]; offset: [number, number] };
	/**
	 * Called for each of its triangles (its own vertex indices): false drops the triangle; a [u, v] pair gives its
	 * three corners that texture coordinate (a flat colour's swatch on an atlas), on vertices of their own.
	 */
	triangle?: (a: number, b: number, c: number) => boolean | [number, number] | void;
}

export interface IgeMergeOptions {
	/** Each mesh's id is this and its material's number: `${id}_0`, `${id}_1`... (default "merged"). */
	id?: string;
	/**
	 * Pack each mesh, ready to upload as it is (`IgeGeometryData3d.packed`), in these encodings:
	 * IGE_QUANTISED_ENCODINGS for compact, quantised vertices; {} for float32. Left out: float arrays.
	 */
	pack?: IgeVertexEncodings;
	/** With `pack`, keep the float arrays too (for raycasts, decals or physics). */
	keepArrays?: boolean;
}

/** One material's merged mesh. */
export interface IgeMergedGeometry {
	/** The material key its pieces had. */
	material: unknown;
	geometry: IgeGeometryData3d;
	triangles: number;
	vertices: number;
	pieces: number;
}

/** A typed array that grows as it's written. */
class Grow<T extends Float32Array | Uint32Array> {
	a: T;
	n = 0;
	constructor (make: new (size: number) => T, size: number) {
		this.a = new make(Math.max(size, 16));
	}

	reserve (extra: number): void {
		if (this.n + extra <= this.a.length) return;
		const b = new (this.a.constructor as new (size: number) => T)(Math.max(this.n + extra, this.a.length * 2));
		b.set(this.a.subarray(0, this.n) as any);
		this.a = b;
	}
}

/** Positions, normals, texture coordinates and colours of one material's mesh as it's built. */
class MergeWriter {
	pos: Grow<Float32Array>;
	nrm?: Grow<Float32Array>;
	uv?: Grow<Float32Array>;
	col?: Grow<Float32Array>;
	idx: Grow<Uint32Array>;
	verts = 0;
	pieces = 0;

	constructor (normals: boolean, uvs: boolean, colors: boolean, room: number) {
		this.pos = new Grow(Float32Array, room * 3);
		if (normals) this.nrm = new Grow(Float32Array, room * 3);
		if (uvs) this.uv = new Grow(Float32Array, room * 2);
		if (colors) this.col = new Grow(Float32Array, room * 4);
		this.idx = new Grow(Uint32Array, room * 2);
	}

	reserve (verts: number, indices: number): void {
		this.pos.reserve(verts * 3);
		this.nrm?.reserve(verts * 3);
		this.uv?.reserve(verts * 2);
		this.col?.reserve(verts * 4);
		this.idx.reserve(indices);
	}
}

/** The arrays of a piece's mesh (a packed one unpacked). */
function sourceArrays (g: IgeMergeSource): IgeVertexArrays & { indices?: ArrayLike<number> } {
	if (g.vertices) return g;
	if (g.packed) return { ...unpackVertices(g.packed), indices: g.indices };
	throw new Error("mergeGeometry: a piece has no vertices");
}

/**
 * Merges placed pieces into one mesh per material (in the order materials first appear). Each piece's matrix moves
 * its positions and turns its normals (by the inverse transpose, so stretched pieces stay lit right); a mirroring
 * matrix flips its triangles' winding so they still face out. Normals, texture coordinates and colours are kept when
 * any piece of the material has them (pieces without get up, 0,0 and white or their `color`). Indices are 16-bit
 * when a mesh has 65,535 vertices or fewer. Each mesh has its bounds (box and sphere) for culling.
 */
export function mergeGeometry (pieces: IgeMergePiece[], options: IgeMergeOptions = {}): IgeMergedGeometry[] {
	// Pieces by material, in the order the materials first appear
	const groups = new Map<unknown, IgeMergePiece[]>();
	for (const piece of pieces) {
		const key = piece.material;
		let list = groups.get(key);
		if (!list) groups.set(key, (list = []));
		list.push(piece);
	}

	const out: IgeMergedGeometry[] = [];
	let n = 0;
	for (const [material, list] of groups) {
		const sources = list.map((p) => sourceArrays(p.geometry));
		let normals = false, uvs = false, colors = false, room = 0;
		for (let i = 0; i < list.length; i++) {
			const s = sources[i];
			if (s.normals) normals = true;
			if (s.uvs) uvs = true;
			if (s.colors || list[i].color) colors = true;
			room += Math.floor(s.vertices!.length / 3);
		}
		const w = new MergeWriter(normals, uvs, colors, room);
		for (let i = 0; i < list.length; i++) addPiece(w, list[i], sources[i]);
		out.push(finish(w, material, `${options.id ?? "merged"}_${n++}`, options));
	}
	return out;
}

/** One piece written into its material's mesh. */
function addPiece (w: MergeWriter, piece: IgeMergePiece, src: IgeVertexArrays & { indices?: ArrayLike<number> }): void {
	const pos = src.vertices!;
	const count = Math.floor(pos.length / 3);
	if (count === 0) return;
	const nrm = src.normals, uv = src.uvs;
	const colSize = src.colors ? Math.round(src.colors.length / count) : 0;
	const col = colSize === 3 || colSize === 4 ? src.colors : undefined;
	const indices = src.indices;
	const triCount = Math.floor((indices ? indices.length : count) / 3);
	const m = piece.matrix;

	// The matrix's normal transform: the cofactors of its 3x3 (inverse transpose up to scale), signed by its
	// determinant so a mirror still turns normals the right way out
	let n00 = 1, n01 = 0, n02 = 0, n10 = 0, n11 = 1, n12 = 0, n20 = 0, n21 = 0, n22 = 1;
	let mirrored = false;
	if (m) {
		const a00 = m[0], a01 = m[1], a02 = m[2], a10 = m[4], a11 = m[5], a12 = m[6], a20 = m[8], a21 = m[9], a22 = m[10];
		// Columns of the cofactor matrix: cross products of the matrix's columns
		n00 = a11 * a22 - a12 * a21; n01 = a12 * a20 - a10 * a22; n02 = a10 * a21 - a11 * a20;
		n10 = a21 * a02 - a22 * a01; n11 = a22 * a00 - a20 * a02; n12 = a20 * a01 - a21 * a00;
		n20 = a01 * a12 - a02 * a11; n21 = a02 * a10 - a00 * a12; n22 = a00 * a11 - a01 * a10;
		const det = a00 * n00 + a01 * n01 + a02 * n02;
		if (det < 0) {
			mirrored = true;
			n00 = -n00; n01 = -n01; n02 = -n02; n10 = -n10; n11 = -n11; n12 = -n12; n20 = -n20; n21 = -n21; n22 = -n22;
		}
	}
	const su = piece.uvTransform?.scale[0] ?? 1, sv = piece.uvTransform?.scale[1] ?? 1;
	const ou = piece.uvTransform?.offset[0] ?? 0, ov = piece.uvTransform?.offset[1] ?? 0;
	const fill = piece.color ?? [1, 1, 1, 1];

	/** Source vertex v written as a new vertex (its texture coordinate replaced if given); returns its index. */
	const write = (v: number, fu?: number, fv?: number): number => {
		const o = w.verts++;
		const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
		const p = w.pos.a;
		if (m) {
			p[o * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
			p[o * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
			p[o * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
		} else {
			p[o * 3] = x; p[o * 3 + 1] = y; p[o * 3 + 2] = z;
		}
		if (w.nrm) {
			const q = w.nrm.a;
			if (nrm) {
				const nx = nrm[v * 3], ny = nrm[v * 3 + 1], nz = nrm[v * 3 + 2];
				let tx = n00 * nx + n10 * ny + n20 * nz, ty = n01 * nx + n11 * ny + n21 * nz, tz = n02 * nx + n12 * ny + n22 * nz;
				const len = Math.sqrt(tx * tx + ty * ty + tz * tz);
				if (len > 0) {
					tx /= len; ty /= len; tz /= len;
				}
				q[o * 3] = tx; q[o * 3 + 1] = ty; q[o * 3 + 2] = tz;
			} else {
				q[o * 3] = 0; q[o * 3 + 1] = 1; q[o * 3 + 2] = 0;
			}
		}
		if (w.uv) {
			const t = w.uv.a;
			if (fu !== undefined) {
				t[o * 2] = fu; t[o * 2 + 1] = fv!;
			} else if (uv) {
				t[o * 2] = uv[v * 2] * su + ou; t[o * 2 + 1] = uv[v * 2 + 1] * sv + ov;
			} else {
				t[o * 2] = 0; t[o * 2 + 1] = 0;
			}
		}
		if (w.col) {
			const c = w.col.a;
			if (col) {
				c[o * 4] = col[v * colSize]; c[o * 4 + 1] = col[v * colSize + 1]; c[o * 4 + 2] = col[v * colSize + 2];
				c[o * 4 + 3] = colSize === 4 ? col[v * colSize + 3] : 1;
			} else {
				c[o * 4] = fill[0]; c[o * 4 + 1] = fill[1]; c[o * 4 + 2] = fill[2]; c[o * 4 + 3] = fill[3] ?? 1;
			}
		}
		return o;
	};

	const tri = piece.triangle;
	const idx = w.idx;
	if (!tri) {
		// Every vertex as it is, indices offset
		w.reserve(count, triCount * 3);
		const base = w.verts;
		for (let v = 0; v < count; v++) write(v);
		const a = idx.a;
		for (let t = 0; t < triCount; t++) {
			const i0 = indices ? indices[t * 3] : t * 3, i1 = indices ? indices[t * 3 + 1] : t * 3 + 1, i2 = indices ? indices[t * 3 + 2] : t * 3 + 2;
			a[idx.n++] = base + i0;
			a[idx.n++] = base + (mirrored ? i2 : i1);
			a[idx.n++] = base + (mirrored ? i1 : i2);
		}
	} else {
		// Triangle by triangle: dropped ones leave their vertices out, recoloured ones get vertices of their own
		const remap = new Int32Array(count).fill(-1);
		for (let t = 0; t < triCount; t++) {
			const i0 = indices ? indices[t * 3] : t * 3, i1 = indices ? indices[t * 3 + 1] : t * 3 + 1, i2 = indices ? indices[t * 3 + 2] : t * 3 + 2;
			const rule = tri(i0, i1, i2);
			if (rule === false) continue;
			w.reserve(3, 3);
			let o0: number, o1: number, o2: number;
			if (Array.isArray(rule)) {
				o0 = write(i0, rule[0], rule[1]);
				o1 = write(i1, rule[0], rule[1]);
				o2 = write(i2, rule[0], rule[1]);
			} else {
				o0 = remap[i0] >= 0 ? remap[i0] : (remap[i0] = write(i0));
				o1 = remap[i1] >= 0 ? remap[i1] : (remap[i1] = write(i1));
				o2 = remap[i2] >= 0 ? remap[i2] : (remap[i2] = write(i2));
			}
			const a = idx.a;
			a[idx.n++] = o0;
			a[idx.n++] = mirrored ? o2 : o1;
			a[idx.n++] = mirrored ? o1 : o2;
		}
	}
	w.pieces++;
}

/** A material's mesh finished: arrays cut to size, bounds, indices 16-bit where they fit, packed if asked. */
function finish (w: MergeWriter, material: unknown, id: string, options: IgeMergeOptions): IgeMergedGeometry {
	const verts = w.verts;
	const vertices = w.pos.a.slice(0, verts * 3);
	const arrays: IgeVertexArrays = { vertices };
	if (w.nrm) arrays.normals = w.nrm.a.slice(0, verts * 3);
	if (w.uv) arrays.uvs = w.uv.a.slice(0, verts * 2);
	if (w.col) arrays.colors = w.col.a.slice(0, verts * 4);
	const indices = verts <= 65535 ? Uint16Array.from(w.idx.a.subarray(0, w.idx.n)) : w.idx.a.slice(0, w.idx.n);
	const b = vertexBounds(vertices, verts);
	const geometry: IgeGeometryData3d = {
		id,
		type: "vertexArr",
		indices,
		boundingBox: { min: b.min, max: b.max },
		boundingSphere: { center: b.center, radius: b.radius }
	};
	if (options.pack) {
		geometry.packed = packVertices(arrays, options.pack);
		if (options.keepArrays) Object.assign(geometry, arrays);
	} else {
		Object.assign(geometry, arrays);
	}
	return { material, geometry, triangles: w.idx.n / 3, vertices: verts, pieces: w.pieces };
}
