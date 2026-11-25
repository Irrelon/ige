/**
 * Building the low-detail proxies of hierarchical level of detail (IgeHlod): a group of chunks (2 x 2, 4 x 4...) as
 * one mesh per material, a small fraction of their triangles, for drawing far away or from high up.
 *
 * igeBuildHlodProxy() takes the group's placed pieces (the same pieces mergeGeometry() takes: the chunks' own merged
 * meshes, their pieces, or the proxies of the level below) and, within an error in world units:
 *
 * 1. merges them into one mesh per material (`material` can map several onto one, so the proxy is one draw: e.g. a
 *    flat-coloured atlas's swatches as vertex colours);
 * 2. drops the parts under `minSize` across in two directions (bins and bollards, posts, ledges and window frames:
 *    dots and lines that can't be seen that far off; a wall is big in two), finding parts by the triangles that
 *    share corners;
 * 3. simplifies what's left: "cluster" (the default) snaps every corner to a grid of `error`-sized cells and keeps the
 *    triangles that still have three corners, one of each that's alike, flat-shaded: fast, and it joins buildings
 *    and pieces that touch, so it goes on reducing where an edge-collapse can't; or "collapse", IgeMeshSimplifier's
 *    quadric edge collapses, which keep the shapes' topology and texture seams but stop at small closed parts;
 * 4. packs them (quantised or as floats) ready to upload, if asked.
 *
 * Pure typed-array code with no engine or DOM, like IgeGeometryMerge: run it in a worker and post the meshes back
 * with geometryTransferables(), or offline, or on the main thread for small groups.
 *
 * @example #A 2 x 2 group of chunks as one draw, to 2 m
 *     const [proxy] = igeBuildHlodProxy(pieces, { id: `hlod_1_${x}_${z}`, error: 2, material: () => "atlas", pack: IGE_QUANTISED_ENCODINGS });
 *     postMessage({ meshes: [proxy] }, geometryTransferables(proxy.geometry));
 */
import { type IgeMergePiece, mergeGeometry } from "@/engine/webgl/IgeGeometryMerge";
import { simplifyGeometry } from "@/engine/webgl/IgeMeshSimplifier";
import { type IgeVertexArrays, type IgeVertexEncodings, packVertices, vertexBounds } from "@/engine/webgl/IgeVertexPacking";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/** How a proxy is made (see igeBuildHlodProxy()). */
export interface IgeHlodProxyOptions {
	/** Each mesh's id is this and its material's number: `${id}_0`... (default "hlod"). */
	id?: string;
	/** How far (world units) a corner of the proxy may be from where it was: its level's error. */
	error: number;
	/**
	 * With "cluster": how far a corner may move up or down (default `error`). Smaller keeps buildings' and hills'
	 * heights from high up while their outlines are merged (a grid of cells `error` across and this tall).
	 */
	heightError?: number;
	/** Parts smaller than this across (world units) in two directions are left out (default `error`; 0 keeps them). */
	minSize?: number;
	/** "cluster" (the default): corners snapped to a grid of `error`; "collapse": quadric edge collapses to `error`. */
	method?: "cluster" | "collapse";
	/** The proxy's material for a piece's (default: its own). Map them all to one key and the proxy is one draw. */
	material?: (key: unknown) => unknown;
	/** Pack each mesh, ready to upload as it is, in these encodings (IGE_QUANTISED_ENCODINGS, or {} for floats). */
	pack?: IgeVertexEncodings;
	/** With `pack`, keep the float arrays too (to build the next level's proxies from). */
	keepArrays?: boolean;
}

/** One material's proxy mesh. */
export interface IgeHlodProxyMesh {
	material: unknown;
	geometry: IgeGeometryData3d;
	/** Triangles in it, and in what it was made from. */
	triangles: number;
	sourceTriangles: number;
	/** Parts left out for being smaller than `minSize`. */
	droppedParts: number;
}

/**
 * Build a group's proxy: its pieces merged, the small parts dropped and the rest simplified to `error` (see the file's
 * notes). One mesh per (mapped) material, empty ones left out.
 */
export function igeBuildHlodProxy (pieces: IgeMergePiece[], options: IgeHlodProxyOptions): IgeHlodProxyMesh[] {
	const id = options.id ?? "hlod";
	const map = options.material;
	const merged = mergeGeometry(map ? pieces.map((p) => ({ ...p, material: map(p.material) })) : pieces, { id });
	const out: IgeHlodProxyMesh[] = [];
	for (let i = 0; i < merged.length; i++) {
		const m = merged[i];
		const meshId = `${id}_${i}`;
		const minSize = options.minSize ?? options.error;
		const kept = minSize > 0 ? igeDropSmallParts(m.geometry, minSize) : { geometry: m.geometry, dropped: 0 };
		let geometry = kept.geometry;
		if ((geometry.indices?.length ?? 0) > 0) {
			geometry = options.method === "collapse"
				? collapse(geometry, options.error, meshId)
				: igeClusterGeometry(geometry, options.error, meshId, options.heightError);
		}
		const triangles = Math.floor((geometry.indices?.length ?? 0) / 3);
		if (triangles === 0) continue;
		out.push({ material: m.material, geometry: finish(geometry, meshId, options), triangles, sourceTriangles: m.triangles, droppedParts: kept.dropped });
	}
	return out;
}

/** Edge collapses until no more fit within `error` (a fraction of the mesh's size, as the simplifier takes it). */
function collapse (geometry: IgeGeometryData3d, error: number, id: string): IgeGeometryData3d {
	const v = geometry.vertices!;
	const b = vertexBounds(v);
	const diagonal = Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) || 1;
	return simplifyGeometry(geometry, { ratio: 0, maxError: error / diagonal, id });
}

/** Bounds, then packed (or float arrays), as mergeGeometry hands meshes back. */
function finish (g: IgeGeometryData3d, id: string, options: IgeHlodProxyOptions): IgeGeometryData3d {
	const vertices = g.vertices!;
	const count = vertices.length / 3;
	const b = vertexBounds(vertices, count);
	const indices = count <= 65535 && !(g.indices instanceof Uint16Array) ? Uint16Array.from(g.indices!) : g.indices!;
	const geometry: IgeGeometryData3d = { id, type: "vertexArr", indices, boundingBox: { min: b.min, max: b.max }, boundingSphere: { center: b.center, radius: b.radius } };
	const arrays: IgeVertexArrays = { vertices };
	if (g.normals) arrays.normals = g.normals;
	if (g.uvs) arrays.uvs = g.uvs;
	if (g.colors) arrays.colors = g.colors;
	if (options.pack) {
		geometry.packed = packVertices(arrays, options.pack);
		if (options.keepArrays) Object.assign(geometry, arrays);
	} else {
		Object.assign(geometry, arrays);
	}
	return geometry;
}

/** Indices of a mesh (its own, or 0, 1, 2... for an unindexed one). */
function indicesOf (g: IgeGeometryData3d): ArrayLike<number> {
	if (g.indices) return g.indices;
	const n = Math.floor((g.vertices?.length ?? 0) / 3);
	const out = new Uint32Array(n - (n % 3));
	for (let i = 0; i < out.length; i++) out[i] = i;
	return out;
}

/**
 * A mesh without the parts under `minSize` across in two directions (their bounding box's middle side: dots and
 * lines, not walls): parts are found by the triangles that share a corner (corners at the same place count as one,
 * so hard edges and seams don't split a part). Returns the mesh (the same one when nothing goes) and how many parts
 * went.
 */
export function igeDropSmallParts (geometry: IgeGeometryData3d, minSize: number): { geometry: IgeGeometryData3d; dropped: number } {
	const pos = geometry.vertices;
	if (!pos) return { geometry, dropped: 0 };
	const count = pos.length / 3;
	const indices = indicesOf(geometry);
	const triangles = Math.floor(indices.length / 3);
	// Corners at one place: one point (welded to a hundredth of the size that matters)
	const weld = Math.max(minSize / 100, 1e-9);
	const point = new Int32Array(count);
	const seen = new Map<string, number>();
	for (let v = 0; v < count; v++) {
		const key = `${Math.round(pos[v * 3] / weld)},${Math.round(pos[v * 3 + 1] / weld)},${Math.round(pos[v * 3 + 2] / weld)}`;
		let p = seen.get(key);
		if (p === undefined) seen.set(key, (p = seen.size));
		point[v] = p;
	}
	// Points joined by triangles (union-find)
	const parent = new Int32Array(seen.size);
	for (let i = 0; i < parent.length; i++) parent[i] = i;
	const root = (a: number): number => {
		while (parent[a] !== a) {
			parent[a] = parent[parent[a]];
			a = parent[a];
		}
		return a;
	};
	const join = (a: number, b: number) => {
		const ra = root(a), rb = root(b);
		if (ra !== rb) parent[ra] = rb;
	};
	for (let t = 0; t < triangles; t++) {
		const a = point[indices[t * 3]];
		join(a, point[indices[t * 3 + 1]]);
		join(a, point[indices[t * 3 + 2]]);
	}
	// Each part's box
	const box = new Map<number, number[]>();
	for (let v = 0; v < count; v++) {
		const r = root(point[v]);
		const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
		const b = box.get(r);
		if (!b) {
			box.set(r, [x, y, z, x, y, z]);
			continue;
		}
		if (x < b[0]) b[0] = x;
		if (y < b[1]) b[1] = y;
		if (z < b[2]) b[2] = z;
		if (x > b[3]) b[3] = x;
		if (y > b[4]) b[4] = y;
		if (z > b[5]) b[5] = z;
	}
	const small = new Set<number>();
	for (const [r, b] of box) {
		// The middle of its three sides: under the size, it's a dot or a line
		const x = b[3] - b[0], y = b[4] - b[1], z = b[5] - b[2];
		const middle = Math.max(Math.min(x, y), Math.min(Math.max(x, y), z));
		if (middle < minSize) small.add(r);
	}
	if (small.size === 0) return { geometry, dropped: 0 };
	const kept: number[] = [];
	for (let t = 0; t < triangles; t++) {
		if (small.has(root(point[indices[t * 3]]))) continue;
		kept.push(indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]);
	}
	return { geometry: { ...geometry, indices: Uint32Array.from(kept) }, dropped: small.size };
}

/**
 * A mesh simplified by snapping its corners to a grid of cells `cell` across and `cellHeight` tall (default `cell`;
 * the grid is offset half a cell, so ground at 0 isn't split between two rows), each to the middle of the corners in
 * its cell: triangles left with fewer than three corners go, as do repeats (the same three cells the same way round).
 * Flat (horizontal) faces keep their own height, only their outline snapped, so flat faces stacked within a row of
 * cells (a roof slab on a building's top, kerbs on a road) don't end up in one plane fighting for the same pixels.
 * The rest are flat-shaded (each face's own normal), each corner keeping its texture coordinate and colour, so an
 * atlas's swatches stay where they were. Corners move by less than a cell's diagonal.
 */
export function igeClusterGeometry (geometry: IgeGeometryData3d, cell: number, id: string = `${geometry.id}_cluster`, cellHeight: number = cell): IgeGeometryData3d {
	const pos = geometry.vertices!;
	const count = pos.length / 3;
	const indices = indicesOf(geometry);
	const triangles = Math.floor(indices.length / 3);
	const size = Math.max(cell, 1e-9), sizeY = Math.max(cellHeight, 1e-9);
	// Each corner's cell, and the cells' middles
	const cellOf = new Int32Array(count);
	const cells = new Map<string, number>();
	let sum = new Float64Array(1024 * 4);
	for (let v = 0; v < count; v++) {
		const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
		const key = `${Math.floor(x / size + 0.5)},${Math.floor(y / sizeY + 0.5)},${Math.floor(z / size + 0.5)}`;
		let c = cells.get(key);
		if (c === undefined) {
			cells.set(key, (c = cells.size));
			if (c * 4 + 4 > sum.length) {
				const more = new Float64Array(sum.length * 2);
				more.set(sum);
				sum = more;
			}
		}
		cellOf[v] = c;
		sum[c * 4] += x;
		sum[c * 4 + 1] += y;
		sum[c * 4 + 2] += z;
		sum[c * 4 + 3]++;
	}
	for (let c = 0; c < cells.size; c++) {
		const n = sum[c * 4 + 3];
		sum[c * 4] /= n;
		sum[c * 4 + 1] /= n;
		sum[c * 4 + 2] /= n;
	}

	const uv = geometry.uvs, col = geometry.colors, hasNormals = !!geometry.normals;
	const outPos: number[] = [], outNrm: number[] = [], outUv: number[] = [], outCol: number[] = [], outIdx: number[] = [];
	const faces = new Set<string>();
	const vertexAt = new Map<string, number>();
	const corner = (v: number, nx: number, ny: number, nz: number, flatY: number): number => {
		const c = cellOf[v];
		// Alike corners shared: the same cell (and height, for a flat face), facing the same way, the same swatch and colour
		let key = `${c}|${Math.round(nx * 64)},${Math.round(ny * 64)},${Math.round(nz * 64)}`;
		if (flatY === flatY) key += `|y${Math.round(flatY * 1000)}`;
		if (uv) key += `|${Math.round(uv[v * 2] * 4096)},${Math.round(uv[v * 2 + 1] * 4096)}`;
		if (col) key += `|${Math.round(col[v * 4] * 255)},${Math.round(col[v * 4 + 1] * 255)},${Math.round(col[v * 4 + 2] * 255)},${Math.round(col[v * 4 + 3] * 255)}`;
		let o = vertexAt.get(key);
		if (o !== undefined) return o;
		o = outPos.length / 3;
		vertexAt.set(key, o);
		outPos.push(sum[c * 4], flatY === flatY ? flatY : sum[c * 4 + 1], sum[c * 4 + 2]);
		outNrm.push(nx, ny, nz);
		if (uv) outUv.push(uv[v * 2], uv[v * 2 + 1]);
		if (col) outCol.push(col[v * 4], col[v * 4 + 1], col[v * 4 + 2], col[v * 4 + 3]);
		return o;
	};
	for (let t = 0; t < triangles; t++) {
		const a = indices[t * 3], b = indices[t * 3 + 1], c = indices[t * 3 + 2];
		const ca = cellOf[a], cb = cellOf[b], cc = cellOf[c];
		if (ca === cb || cb === cc || ca === cc) continue;
		// A flat face (a roof, a floor, the ground) keeps its own height, only its outline snapped: flat faces stacked
		// in one row of cells (a roof slab on a building's top) stay apart rather than meeting in one plane and
		// fighting for the same pixels
		const pa = a * 3, pb = b * 3, pc = c * 3;
		const e1x = pos[pb] - pos[pa], e1y = pos[pb + 1] - pos[pa + 1], e1z = pos[pb + 2] - pos[pa + 2];
		const e2x = pos[pc] - pos[pa], e2y = pos[pc + 1] - pos[pa + 1], e2z = pos[pc + 2] - pos[pa + 2];
		const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
		const flat = Math.abs(fy) > 0.999 * Math.hypot(fx, fy, fz);
		const flatY = flat ? (pos[pa + 1] + pos[pb + 1] + pos[pc + 1]) / 3 : NaN;
		// The same three cells the same way round (at the same height, if flat): once
		let key = ca < cb && ca < cc ? `${ca},${cb},${cc}` : cb < cc ? `${cb},${cc},${ca}` : `${cc},${ca},${cb}`;
		if (flat) key += `|${Math.round(flatY * 1000)}`;
		if (faces.has(key)) continue;
		// Its face normal, from where its corners went
		const ax = sum[ca * 4], ay = flat ? flatY : sum[ca * 4 + 1], az = sum[ca * 4 + 2];
		const ux = sum[cb * 4] - ax, uy = (flat ? flatY : sum[cb * 4 + 1]) - ay, uz = sum[cb * 4 + 2] - az;
		const vx = sum[cc * 4] - ax, vy = (flat ? flatY : sum[cc * 4 + 1]) - ay, vz = sum[cc * 4 + 2] - az;
		let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
		const len = Math.hypot(nx, ny, nz);
		if (len < size * Math.min(size, sizeY) * 1e-6) continue;
		nx /= len;
		ny /= len;
		nz /= len;
		faces.add(key);
		outIdx.push(corner(a, nx, ny, nz, flatY), corner(b, nx, ny, nz, flatY), corner(c, nx, ny, nz, flatY));
	}
	const out: IgeGeometryData3d = {
		id,
		type: "vertexArr",
		vertices: Float32Array.from(outPos),
		indices: outPos.length / 3 <= 65535 ? Uint16Array.from(outIdx) : Uint32Array.from(outIdx)
	};
	if (hasNormals || outIdx.length) out.normals = Float32Array.from(outNrm);
	if (uv) out.uvs = Float32Array.from(outUv);
	if (col) out.colors = Float32Array.from(outCol);
	return out;
}
