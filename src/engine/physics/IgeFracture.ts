/*
 * Run-time fracture: cut a mesh into convex pieces where it was hit.
 *
 * Pure and deterministic. Given the same mesh, impact point, impulse and
 * seed, every machine cuts the same pieces, in the same order, to the
 * same bits: the maths here is only +, -, *, / and Math.sqrt (no sin,
 * cos, pow or atan2, whose last bits differ between JavaScript engines),
 * random numbers come from a seeded generator, and every sort has a
 * deterministic order. So a server can break a prop and send only
 * { seed, point, impulse }, and clients cut the same pieces themselves.
 *
 * It works on convex parts. A mesh is split into its connected parts
 * (welded by position), and each part is cut separately. Props built from
 * convex parts (boxes, planks, panes, wedges) give exact, capped, convex
 * pieces; a part that isn't convex is still cut, but its caps may overlap.
 *
 * Patterns, per part ("auto" picks one from the part's shape):
 * - "voronoi": Voronoi cells round seed points clustered at the hit, so
 *   pieces are smaller near it (chunky parts: concrete, solid blocks).
 * - "slab": the same, with the points flattened onto the part's middle,
 *   so a thin part breaks into shards through its whole thickness, not
 *   lumps (plastic walls, boards).
 * - "glass": radial cracks from the hit and rings round it (thin parts).
 * - "planks": long parts snap across the grain (with a slant) near the
 *   hit and split along it sometimes; parts further away come off whole.
 * - "parts": no cutting; each part comes off as a piece (pre-made pieces
 *   in one mesh).
 * - "whole": the whole mesh as one piece (knocked loose, not broken).
 *
 * Nothing here knows about entities, physics or the renderer, so it runs
 * in a worker unchanged (see igeFractureTransferables()).
 */

export interface IgeFractureVec3 {
	x: number;
	y: number;
	z: number;
}

export interface IgeFractureColor {
	r: number;
	g: number;
	b: number;
	a?: number;
}

/** A triangle mesh: an IgeGeometryData3d fits. */
export interface IgeFractureMesh {
	/** x, y, z per vertex. */
	vertices?: ArrayLike<number>;
	/** Three per triangle; without, every three vertices are a triangle. */
	indices?: ArrayLike<number> | null;
	normals?: ArrayLike<number> | null;
	uvs?: ArrayLike<number> | null;
	/** r, g, b, a per vertex. */
	colors?: ArrayLike<number> | null;
}

export type IgeFracturePattern = "auto" | "voronoi" | "slab" | "glass" | "planks" | "parts" | "whole";

export interface IgeFractureOptions {
	/** Any whole number. The same seed (with the same mesh and hit) gives the same pieces. */
	seed: number;
	/** Where it was hit, in the mesh's own space. */
	point: IgeFractureVec3;
	/** The impulse's direction, mesh space (any length; zero or missing: none). */
	direction?: IgeFractureVec3;
	/** About how many pieces near the hit (Voronoi cells; glass and planks scale from it). Default 12. */
	pieces?: number;
	/** Default "auto". */
	pattern?: IgeFracturePattern;
	/** Thin parts crack like glass (radial and concentric) under "auto". */
	glass?: boolean;
	/** 0-1: how much the cells cluster round the hit (default 0.65). */
	focus?: number;
	/** How far from the hit parts break, mesh units (default: half the mesh's diagonal). Parts beyond come off whole. */
	radius?: number;
	/** Colour of cut faces (default a light grey). */
	insideColor?: IgeFractureColor;
	/** Texture repeats per mesh unit on cut faces (default: once across the mesh). */
	insideUvScale?: number;
	/** Pieces at least this big (mesh units cubed) are "big" (default: never). */
	bigVolume?: number;
	/** At most this many big pieces, the largest (default 8). */
	maxBig?: number;
	/** Drop slivers smaller than this (mesh units cubed; default 1/2000 of the mesh). */
	minVolume?: number;
}

/** One piece: a closed convex mesh around its own centre. */
export interface IgeFracturePiece {
	/** Its place in the result: stable for the same inputs, so it can name the piece on every machine. */
	index: number;
	/** Which connected part of the mesh it came from. */
	part: number;
	/** At least bigVolume (and among the maxBig largest). */
	big: boolean;
	/** Mesh units cubed. */
	volume: number;
	/** Its centre of mass in the mesh's space. The arrays below are relative to it. */
	centre: IgeFractureVec3;
	/** Half its size along each axis, round the centre. */
	halfExtents: IgeFractureVec3;
	vertices: Float32Array;
	normals: Float32Array;
	uvs: Float32Array;
	colors: Float32Array;
	indices: Uint16Array | Uint32Array;
	/** Its corners (x, y, z each, relative to the centre): the points of a convex hull collision shape. */
	hull: Float32Array;
	/**
	 * A piece made of convex pieces of several touching parts (a shard of a
	 * shell across its segments) has each one's corners here, for a
	 * compound of convex hulls. A single convex piece has just `hull`.
	 */
	hulls?: Float32Array[];
	/** Triangles on cut faces (the inside showing): for effects. */
	insideTriangles: number;
}

export interface IgeFractureResult {
	pieces: IgeFracturePiece[];
	/** The mesh's volume (mesh units cubed). */
	volume: number;
	/** Connected parts the mesh was made of. */
	parts: number;
	/** Parts that weren't convex (their caps may overlap). */
	nonConvexParts: number;
	/** Volume of slivers dropped (under minVolume). */
	droppedVolume: number;
	/** Plane cuts made. */
	cuts: number;
	/** How long it took (milliseconds). Not part of the deterministic output. */
	ms: number;
}

/* Vertices while cutting: x, y, z, nx, ny, nz, u, v, r, g, b, a */
type V = number[];
interface Face {
	v: V[];
	inside: boolean;
}
type Solid = Face[];

interface CapStyle {
	r: number;
	g: number;
	b: number;
	a: number;
	uvScale: number;
	eps: number;
}

interface Part {
	index: number;
	solid: Solid;
	/** Bounding sphere. */
	cx: number;
	cy: number;
	cz: number;
	radius: number;
	/** Box frame: axes (unit) and half sizes, sorted thin to long. */
	axes: [number, number, number][];
	half: [number, number, number];
	/** Centre of that box. */
	ox: number;
	oy: number;
	oz: number;
	convex: boolean;
	volume: number;
}

/** A seeded random number generator (mulberry32): the same seed, the same numbers on every machine. */
export function igeFractureRandom (seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A 32-bit hash of a string (FNV-1a), e.g. a seed from a prop's id. */
export function igeFractureSeed (text: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/**
 * A checksum of pieces (their arrays' bits, in order): equal checksums
 * mean two machines cut the same pieces.
 */
export function igeFractureChecksum (pieces: IgeFracturePiece[]): number {
	let h = 0x811c9dc5;
	const mix = (array: Float32Array | Uint16Array | Uint32Array) => {
		const words = array instanceof Float32Array ? new Uint32Array(array.buffer, array.byteOffset, array.length) : array;
		for (let i = 0; i < words.length; i++) {
			h ^= words[i];
			h = Math.imul(h, 0x01000193);
		}
	};
	for (const piece of pieces) {
		h ^= piece.index + (piece.big ? 0x10000 : 0);
		h = Math.imul(h, 0x01000193);
		mix(piece.vertices); mix(piece.normals); mix(piece.uvs); mix(piece.colors); mix(piece.indices); mix(piece.hull);
		for (const hull of piece.hulls ?? []) mix(hull);
		mix(new Float32Array([piece.centre.x, piece.centre.y, piece.centre.z, piece.volume]));
	}
	return h >>> 0;
}

/**
 * Split a mesh into its parts now rather than on its first break (each
 * mesh object is split once and kept, however many props share it).
 */
export function igeFracturePrepare (mesh: IgeFractureMesh, insideUvScale?: number): void {
	prepare(mesh, insideUvScale);
}

/** The buffers of a result, to transfer it from a worker with postMessage() without copying. */
export function igeFractureTransferables (result: IgeFractureResult): ArrayBuffer[] {
	const buffers: ArrayBuffer[] = [];
	for (const piece of result.pieces) {
		for (const array of [piece.vertices, piece.normals, piece.uvs, piece.colors, piece.indices, piece.hull, ...(piece.hulls ?? [])]) {
			buffers.push(array.buffer as ArrayBuffer);
		}
	}
	return buffers;
}

const DEFAULT_INSIDE: Required<IgeFractureColor> = { r: 0.8, g: 0.78, b: 0.74, a: 1 };

/**
 * Cut a mesh into pieces round a hit. Deterministic: see the top of this
 * file.
 * @example #Break a crate where it was hit
 *     const result = igeFracture(crateGeometry, { seed: 1234, point: { x: 0, y: 20, z: 30 }, direction: { x: 0, y: 0, z: -1 }, pieces: 12 });
 *     for (const piece of result.pieces) spawn(piece.vertices, piece.indices, piece.centre);
 */
export function igeFracture (mesh: IgeFractureMesh, options: IgeFractureOptions): IgeFractureResult {
	const started = typeof performance !== "undefined" ? performance.now() : Date.now();
	const rng = igeFractureRandom(options.seed);
	const { source, parts, uvScale } = prepare(mesh, options.insideUvScale);
	const size = source.diagonal || 1;
	const eps = size * 1e-6;
	const inside = { ...DEFAULT_INSIDE, ...options.insideColor };
	const cap: CapStyle = { r: inside.r, g: inside.g, b: inside.b, a: inside.a ?? 1, uvScale, eps };
	const pattern = options.pattern ?? "auto";
	const count = Math.max(1, Math.floor(options.pieces ?? 12));
	const point = options.point;
	const radius = options.radius ?? size * 0.35;
	const stats = { cuts: 0 };

	let direction: IgeFractureVec3 | null = null;
	if (options.direction) {
		const d = options.direction;
		const len = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
		if (len > 0) direction = { x: d.x / len, y: d.y / len, z: d.z / len };
	}

	// Each piece: one convex solid, or several (a Voronoi cell across touching parts)
	const groups: { part: number; solids: Solid[] }[] = [];
	let totalVolume = 0;
	for (const part of parts) totalVolume += part.volume;

	if (pattern === "whole" || count <= 1) {
		groups.push({ part: 0, solids: parts.map((part) => part.solid) });
	} else if (pattern === "parts") {
		for (const part of parts) groups.push({ part: part.index, solids: [part.solid] });
	} else {
		// Seed points for Voronoi cells: clustered round the hit, pushed a little inside along the blow
		const focusPoint = {
			x: point.x + (direction ? direction.x * size * 0.04 : 0),
			y: point.y + (direction ? direction.y * size * 0.04 : 0),
			z: point.z + (direction ? direction.z * size * 0.04 : 0)
		};
		let sites: number[] | null = null;
		const getSites = () => (sites ??= voronoiSites(rng, count, source, focusPoint, radius, options.focus ?? 0.65));
		// Voronoi cells by site, gathered across parts
		const cellsBySite = new Map<number, { part: number; solid: Solid }[]>();

		// Whole parts and plank pieces: those far from the hit stay joined to what they touch (the far side
		// of a crate, the end of a fence with the stubs of its rails); those near it come apart
		const loose: { part: number; solid: Solid }[] = [];
		for (const part of parts) {
			const kind = partPattern(part, pattern, !!options.glass);
			if (kind === "whole" || distanceToPart(point, part) > radius) {
				loose.push({ part: part.index, solid: part.solid });
				continue;
			}
			if (kind === "planks") {
				for (const solid of plankCells(part, point, radius, rng, cap, stats)) loose.push({ part: part.index, solid });
				continue;
			}
			if (kind === "glass") {
				for (const solid of glassCells(part, point, count, rng, cap, stats)) groups.push({ part: part.index, solids: [solid] });
				continue;
			}
			for (const { site, solid } of voronoiCells(part, getSites(), kind === "slab", cap, stats)) {
				const list = cellsBySite.get(site);
				if (list) list.push({ part: part.index, solid });
				else cellsBySite.set(site, [{ part: part.index, solid }]);
			}
		}
		const far: { part: number; solid: Solid }[] = [];
		for (const item of loose) {
			if (boxDistance(point, item.solid) > radius * 0.5) far.push(item);
			else groups.push({ part: item.part, solids: [item.solid] });
		}
		for (const cluster of touchingClusters(far.map((item) => item.solid), eps * 100)) {
			groups.push({ part: far[cluster[0]].part, solids: cluster.map((i) => far[i].solid) });
		}

		// A cell's fragments in parts that touch each other are one piece (a shard of a shell spanning its segments)
		const siteOrder = [...cellsBySite.keys()].sort((a, b) => a - b);
		for (const site of siteOrder) {
			const fragments = cellsBySite.get(site)!;
			for (const cluster of touchingClusters(fragments.map((f) => f.solid), eps * 100)) {
				groups.push({ part: fragments[cluster[0]].part, solids: cluster.map((i) => fragments[i].solid) });
			}
		}
	}

	// Pieces, slivers dropped
	const minVolume = options.minVolume ?? totalVolume * 5e-4;
	const pieces: IgeFracturePiece[] = [];
	let dropped = 0;
	for (const { part, solids } of groups) {
		const built: IgeFracturePiece[] = [];
		for (const solid of solids) {
			const piece = buildPiece(solid, part, pieces.length, eps);
			if (!piece) continue;
			if (piece.volume < minVolume) {
				dropped += Math.max(0, piece.volume);
				continue;
			}
			built.push(piece);
		}
		if (!built.length) continue;
		const piece = built.length === 1 ? built[0] : mergePieces(built, eps);
		piece.index = pieces.length;
		pieces.push(piece);
	}

	// Big pieces: at least bigVolume, the largest maxBig of them
	if (options.bigVolume !== undefined) {
		const candidates = pieces.filter((piece) => piece.volume >= options.bigVolume!);
		candidates.sort((a, b) => b.volume - a.volume || a.index - b.index);
		const maxBig = options.maxBig ?? 8;
		for (let i = 0; i < candidates.length && i < maxBig; i++) candidates[i].big = true;
	}

	const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
	return {
		pieces,
		volume: totalVolume,
		parts: parts.length,
		nonConvexParts: parts.filter((part) => !part.convex).length,
		droppedVolume: dropped,
		cuts: stats.cuts,
		ms: ended - started
	};
}

/* Reading the mesh */

interface Prepared {
	source: SourceMesh;
	parts: Part[];
	uvScale: number;
	uvKey: number | undefined;
}

/**
 * A mesh's parts, worked out once per mesh object and kept (props share
 * meshes). Cutting never changes them. Change a mesh's arrays in place
 * and pass a new object, or the old parts are used.
 */
const prepared = new WeakMap<object, Prepared>();

function prepare (mesh: IgeFractureMesh, insideUvScale: number | undefined): Prepared {
	const cached = prepared.get(mesh);
	// Planar uvs on the outside (a mesh without uvs) depend on the scale
	if (cached && (cached.source.uvs || cached.uvKey === insideUvScale)) return cached;
	const source = readMesh(mesh);
	const size = source.diagonal || 1;
	const uvScale = insideUvScale ?? 1 / size;
	const style: CapStyle = { ...DEFAULT_INSIDE, uvScale, eps: size * 1e-6 } as CapStyle;
	const entry = { source, parts: splitParts(source, style), uvScale, uvKey: insideUvScale };
	prepared.set(mesh, entry);
	return entry;
}

interface SourceMesh {
	positions: ArrayLike<number>;
	normals: ArrayLike<number> | null;
	uvs: ArrayLike<number> | null;
	colors: ArrayLike<number> | null;
	triangles: number[];
	min: [number, number, number];
	max: [number, number, number];
	diagonal: number;
}

function readMesh (mesh: IgeFractureMesh): SourceMesh {
	const positions = mesh.vertices;
	if (!positions || positions.length < 9) throw new Error("igeFracture: the mesh has no triangles");
	const vertexCount = Math.floor(positions.length / 3);
	const triangles: number[] = [];
	if (mesh.indices && mesh.indices.length >= 3) {
		for (let i = 0; i + 2 < mesh.indices.length; i += 3) triangles.push(mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]);
	} else {
		for (let i = 0; i + 2 < vertexCount; i += 3) triangles.push(i, i + 1, i + 2);
	}
	const min: [number, number, number] = [Infinity, Infinity, Infinity];
	const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
	for (let i = 0; i < vertexCount; i++) {
		for (let k = 0; k < 3; k++) {
			const value = positions[i * 3 + k];
			if (value < min[k]) min[k] = value;
			if (value > max[k]) max[k] = value;
		}
	}
	const dx = max[0] - min[0], dy = max[1] - min[1], dz = max[2] - min[2];
	return {
		positions,
		normals: mesh.normals && mesh.normals.length >= vertexCount * 3 ? mesh.normals : null,
		uvs: mesh.uvs && mesh.uvs.length >= vertexCount * 2 ? mesh.uvs : null,
		colors: mesh.colors && mesh.colors.length >= vertexCount * 4 ? mesh.colors : null,
		triangles,
		min,
		max,
		diagonal: Math.sqrt(dx * dx + dy * dy + dz * dz)
	};
}

/**
 * The mesh's connected parts, as solids of outer faces. Triangles join
 * across an edge (corner positions welded) that exactly two triangles
 * share, so boxes that only touch (planks laid against each other, a
 * crate's sides meeting at its corners) stay separate parts.
 */
function splitParts (mesh: SourceMesh, cap: CapStyle): Part[] {
	const { positions, triangles } = mesh;
	const quantum = (mesh.diagonal || 1) * 1e-5;
	const ids = new Map<string, number>();
	const weld: number[] = [];
	const vertexCount = Math.floor(positions.length / 3);
	for (let i = 0; i < vertexCount; i++) {
		const key = `${Math.round(positions[i * 3] / quantum)},${Math.round(positions[i * 3 + 1] / quantum)},${Math.round(positions[i * 3 + 2] / quantum)}`;
		let id = ids.get(key);
		if (id === undefined) {
			id = ids.size;
			ids.set(key, id);
		}
		weld.push(id);
	}
	const triangleCount = triangles.length / 3;
	const parent: number[] = [];
	for (let i = 0; i < triangleCount; i++) parent.push(i);
	const find = (i: number): number => {
		while (parent[i] !== i) {
			parent[i] = parent[parent[i]];
			i = parent[i];
		}
		return i;
	};
	const union = (i: number, j: number) => {
		const a = find(i), b = find(j);
		if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
	};
	// Each edge's triangles: t * 2, plus 1 when it runs the edge from the higher corner to the lower
	const edges = new Map<number, number[]>();
	const stride = ids.size + 1;
	for (let t = 0; t < triangleCount; t++) {
		for (let k = 0; k < 3; k++) {
			const a = weld[triangles[t * 3 + k]], b = weld[triangles[t * 3 + (k + 1) % 3]];
			if (a === b) continue;
			const key = a < b ? a * stride + b : b * stride + a;
			const entry = t * 2 + (a < b ? 0 : 1);
			const list = edges.get(key);
			if (list) list.push(entry);
			else edges.set(key, [entry]);
		}
	}
	for (const list of edges.values()) {
		if (list.length === 2) {
			union(list[0] >> 1, list[1] >> 1);
			continue;
		}
		// More than two triangles on an edge (parts touching along it): each pairs with the next
		// triangle running the other way round the edge, turning from it into its own solid
		for (const entry of list) {
			const t = entry >> 1;
			let best = -1, bestAngle = Infinity;
			for (const other of list) {
				if ((other & 1) === (entry & 1)) continue;
				const angle = turnAngle(positions, triangles, t, other >> 1);
				if (angle > 1e-6 && angle < bestAngle) {
					bestAngle = angle;
					best = other >> 1;
				}
			}
			if (best >= 0) union(t, best);
		}
	}

	// Triangles by part, parts in the order their first triangle comes
	const partOf = new Map<number, number>();
	const groups: number[][] = [];
	for (let t = 0; t < triangleCount; t++) {
		const root = find(t);
		let index = partOf.get(root);
		if (index === undefined) {
			index = groups.length;
			partOf.set(root, index);
			groups.push([]);
		}
		groups[index].push(triangles[t * 3], triangles[t * 3 + 1], triangles[t * 3 + 2]);
	}

	const parts: Part[] = [];
	for (const group of groups) {
		const solid: Solid = [];
		for (let t = 0; t < group.length; t += 3) {
			const face = triangleFace(mesh, group[t], group[t + 1], group[t + 2], cap);
			if (face) solid.push(face);
		}
		if (solid.length < 4) continue;
		// Wound inside out: turn it round
		let volume = solidVolume(solid);
		if (volume < 0) {
			for (const face of solid) face.v.reverse();
			volume = -volume;
		}
		const part = describePart(parts.length, solid, volume, cap.eps);
		// A convex part's coplanar triangles become one polygon each: fewer, larger faces to cut
		if (part.convex) part.solid = mergeCoplanar(solid, cap.eps);
		parts.push(part);
	}
	return parts;
}

/**
 * Coplanar triangles of a convex solid as one polygon, where they share
 * their corners' normals, uvs and colours and cover a simple polygon (no
 * corners in the middle). Other faces are left as they are.
 */
function mergeCoplanar (solid: Solid, eps: number): Solid {
	type Plane = { nx: number; ny: number; nz: number; d: number; faces: Face[] };
	const planes: Plane[] = [];
	for (const face of solid) {
		const [a, b, c] = face.v;
		const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
		const e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
		let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
		const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
		nx /= len; ny /= len; nz /= len;
		const d = nx * a[0] + ny * a[1] + nz * a[2];
		let group: Plane | null = null;
		for (const plane of planes) {
			if (plane.nx * nx + plane.ny * ny + plane.nz * nz > 1 - 1e-7 && Math.abs(plane.d - d) <= eps * 10) {
				group = plane;
				break;
			}
		}
		if (group) group.faces.push(face);
		else planes.push({ nx, ny, nz, d, faces: [face] });
	}
	const merged: Solid = [];
	const eps2 = eps * eps * 4;
	for (const plane of planes) {
		if (plane.faces.length === 1) {
			merged.push(plane.faces[0]);
			continue;
		}
		const unique: V[] = [];
		let consistent = true;
		for (const face of plane.faces) {
			for (const p of face.v) {
				let same: V | null = null;
				for (const q of unique) {
					const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
					if (dx * dx + dy * dy + dz * dz <= eps2) {
						same = q;
						break;
					}
				}
				if (!same) unique.push(p);
				else {
					for (let k = 3; k < 12; k++) {
						if (Math.abs(same[k] - p[k]) > 1e-6) consistent = false;
					}
				}
			}
		}
		if (!consistent || unique.length !== plane.faces.length + 2) {
			for (const face of plane.faces) merged.push(face);
			continue;
		}
		merged.push({ v: orderRound(unique, plane.nx, plane.ny, plane.nz), inside: false });
	}
	return merged;
}

/** Points on a plane in order round their centre, anticlockwise seen from +n. */
function orderRound (points: V[], nx: number, ny: number, nz: number): V[] {
	let cx = 0, cy = 0, cz = 0;
	for (const p of points) {
		cx += p[0]; cy += p[1]; cz += p[2];
	}
	cx /= points.length; cy /= points.length; cz /= points.length;
	// A basis in the plane: u, then v = n x u (so increasing angle runs anticlockwise seen from +n)
	let ux: number, uy: number, uz: number;
	if (Math.abs(nx) < 0.9) {
		ux = 0; uy = nz; uz = -ny;
	} else {
		ux = -nz; uy = 0; uz = nx;
	}
	const ul = Math.sqrt(ux * ux + uy * uy + uz * uz);
	ux /= ul; uy /= ul; uz /= ul;
	const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
	const keyed = points.map((p, i) => {
		const dx = p[0] - cx, dy = p[1] - cy, dz = p[2] - cz;
		const x = dx * ux + dy * uy + dz * uz, y = dx * vx + dy * vy + dz * vz;
		return { p, a: pseudoAngle(x, y), r: x * x + y * y, i };
	});
	keyed.sort((a, b) => a.a - b.a || a.r - b.r || a.i - b.i);
	return keyed.map((k) => k.p);
}

/**
 * How far (a pseudo-angle, 0 to 4) triangle u's half-plane lies round
 * their shared edge from triangle t's, turning from t into the solid
 * behind it (away from its normal).
 */
function turnAngle (p: ArrayLike<number>, triangles: number[], t: number, u: number): number {
	// The corners of t and u, and which of t's corners isn't on u
	const tc = [triangles[t * 3], triangles[t * 3 + 1], triangles[t * 3 + 2]];
	const uc = [triangles[u * 3], triangles[u * 3 + 1], triangles[u * 3 + 2]];
	const near = (i: number, j: number) => Math.abs(p[i * 3] - p[j * 3]) + Math.abs(p[i * 3 + 1] - p[j * 3 + 1]) + Math.abs(p[i * 3 + 2] - p[j * 3 + 2]) === 0;
	const shared = (i: number, list: number[]) => list.some((j) => near(i, j));
	const tOff = tc.find((i) => !shared(i, uc));
	const uOff = uc.find((i) => !shared(i, tc));
	const edge = tc.filter((i) => shared(i, uc));
	if (tOff === undefined || uOff === undefined || edge.length < 2) return Infinity;
	const ax = p[edge[0] * 3], ay = p[edge[0] * 3 + 1], az = p[edge[0] * 3 + 2];
	let ex = p[edge[1] * 3] - ax, ey = p[edge[1] * 3 + 1] - ay, ez = p[edge[1] * 3 + 2] - az;
	const el = Math.sqrt(ex * ex + ey * ey + ez * ez);
	ex /= el; ey /= el; ez /= el;
	const across = (i: number): [number, number, number] => {
		let x = p[i * 3] - ax, y = p[i * 3 + 1] - ay, z = p[i * 3 + 2] - az;
		const along = x * ex + y * ey + z * ez;
		x -= along * ex; y -= along * ey; z -= along * ez;
		const len = Math.sqrt(x * x + y * y + z * z) || 1;
		return [x / len, y / len, z / len];
	};
	const wt = across(tOff), wu = across(uOff);
	// t's normal
	const i0 = tc[0] * 3, i1 = tc[1] * 3, i2 = tc[2] * 3;
	const e1x = p[i1] - p[i0], e1y = p[i1 + 1] - p[i0 + 1], e1z = p[i1 + 2] - p[i0 + 2];
	const e2x = p[i2] - p[i0], e2y = p[i2 + 1] - p[i0 + 1], e2z = p[i2 + 2] - p[i0 + 2];
	let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
	const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
	nx /= nl; ny /= nl; nz /= nl;
	const x = wu[0] * wt[0] + wu[1] * wt[1] + wu[2] * wt[2];
	const y = -(wu[0] * nx + wu[1] * ny + wu[2] * nz);
	return pseudoAngle(x, y);
}

function triangleFace (mesh: SourceMesh, a: number, b: number, c: number, cap: CapStyle): Face | null {
	const p = mesh.positions;
	const ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2];
	const e1x = p[b * 3] - ax, e1y = p[b * 3 + 1] - ay, e1z = p[b * 3 + 2] - az;
	const e2x = p[c * 3] - ax, e2y = p[c * 3 + 1] - ay, e2z = p[c * 3 + 2] - az;
	let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
	const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
	if (len <= cap.eps * cap.eps) return null; // no area
	nx /= len; ny /= len; nz /= len;
	const vertex = (i: number): V => {
		const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
		const n = mesh.normals;
		const uv = mesh.uvs;
		const col = mesh.colors;
		const out = [x, y, z, nx, ny, nz, 0, 0, 1, 1, 1, 1];
		if (n) {
			out[3] = n[i * 3]; out[4] = n[i * 3 + 1]; out[5] = n[i * 3 + 2];
		}
		if (uv) {
			out[6] = uv[i * 2]; out[7] = uv[i * 2 + 1];
		} else {
			planarUv(out, nx, ny, nz, cap.uvScale);
		}
		if (col) {
			out[8] = col[i * 4]; out[9] = col[i * 4 + 1]; out[10] = col[i * 4 + 2]; out[11] = col[i * 4 + 3];
		}
		return out;
	};
	return { v: [vertex(a), vertex(b), vertex(c)], inside: false };
}

function planarUv (out: V, nx: number, ny: number, nz: number, scale: number): void {
	const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
	if (ax >= ay && ax >= az) {
		out[6] = out[2] * scale; out[7] = out[1] * scale;
	} else if (ay >= az) {
		out[6] = out[0] * scale; out[7] = out[2] * scale;
	} else {
		out[6] = out[0] * scale; out[7] = out[1] * scale;
	}
}

/** Signed volume (positive when wound outward). */
function solidVolume (solid: Solid): number {
	const r = solid[0].v[0];
	let six = 0;
	for (const face of solid) {
		const v = face.v;
		const a = v[0];
		for (let i = 1; i + 1 < v.length; i++) six += tetra(r, a, v[i], v[i + 1]);
	}
	return six / 6;
}

function tetra (r: V, a: V, b: V, c: V): number {
	const ax = a[0] - r[0], ay = a[1] - r[1], az = a[2] - r[2];
	const bx = b[0] - r[0], by = b[1] - r[1], bz = b[2] - r[2];
	const cx = c[0] - r[0], cy = c[1] - r[1], cz = c[2] - r[2];
	return ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
}

/** A part's bounding sphere, its box frame (from its biggest faces and their edges) and whether it's convex. */
function describePart (index: number, solid: Solid, volume: number, eps: number): Part {
	// Unique corners
	const points: number[] = [];
	let sx = 0, sy = 0, sz = 0, count = 0;
	for (const face of solid) {
		for (const v of face.v) {
			points.push(v[0], v[1], v[2]);
			sx += v[0]; sy += v[1]; sz += v[2]; count++;
		}
	}
	const cx = sx / count, cy = sy / count, cz = sz / count;
	let radius = 0;
	for (let i = 0; i < points.length; i += 3) {
		const dx = points[i] - cx, dy = points[i + 1] - cy, dz = points[i + 2] - cz;
		const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
		if (d > radius) radius = d;
	}

	// The normal with the most area (either way round): a slab's face, a plank's wide side
	const groups: { x: number; y: number; z: number; area: number }[] = [];
	const faceNormals: [number, number, number, number][] = [];
	for (const face of solid) {
		const v = face.v;
		let nx = 0, ny = 0, nz = 0;
		for (let i = 1; i + 1 < v.length; i++) {
			const e1x = v[i][0] - v[0][0], e1y = v[i][1] - v[0][1], e1z = v[i][2] - v[0][2];
			const e2x = v[i + 1][0] - v[0][0], e2y = v[i + 1][1] - v[0][1], e2z = v[i + 1][2] - v[0][2];
			nx += e1y * e2z - e1z * e2y; ny += e1z * e2x - e1x * e2z; nz += e1x * e2y - e1y * e2x;
		}
		const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
		if (len <= 0) continue;
		const area = len / 2;
		nx /= len; ny /= len; nz /= len;
		faceNormals.push([nx, ny, nz, nx * v[0][0] + ny * v[0][1] + nz * v[0][2]]);
		let found = false;
		for (const g of groups) {
			const dot = g.x * nx + g.y * ny + g.z * nz;
			if (dot > 0.999 || dot < -0.999) {
				g.area += area;
				found = true;
				break;
			}
		}
		if (!found) groups.push({ x: nx, y: ny, z: nz, area });
	}
	let best = groups[0];
	for (const g of groups) if (g.area > best.area) best = g;
	const ax: [number, number, number] = [best.x, best.y, best.z];

	// In that plane: the edge direction giving the smallest bounding rectangle
	let bestArea = Infinity;
	let bx: [number, number, number] = [1, 0, 0], cxis: [number, number, number] = [0, 0, 1];
	for (const face of solid) {
		const v = face.v;
		for (let i = 0; i < v.length; i++) {
			const a = v[i], b = v[(i + 1) % v.length];
			let ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
			const along = ex * ax[0] + ey * ax[1] + ez * ax[2];
			ex -= along * ax[0]; ey -= along * ax[1]; ez -= along * ax[2];
			const len = Math.sqrt(ex * ex + ey * ey + ez * ez);
			if (len <= eps) continue;
			ex /= len; ey /= len; ez /= len;
			const fx = ax[1] * ez - ax[2] * ey, fy = ax[2] * ex - ax[0] * ez, fz = ax[0] * ey - ax[1] * ex;
			const e = extent(points, ex, ey, ez), f = extent(points, fx, fy, fz);
			const area = (e[1] - e[0]) * (f[1] - f[0]);
			if (area < bestArea * (1 - 1e-9)) {
				bestArea = area;
				bx = [ex, ey, ez];
				cxis = [fx, fy, fz];
			}
		}
	}
	const axesAll: [number, number, number][] = [ax, bx, cxis];
	const ranges = axesAll.map((a) => extent(points, a[0], a[1], a[2]));
	const order = [0, 1, 2].sort((i, j) => (ranges[i][1] - ranges[i][0]) - (ranges[j][1] - ranges[j][0]) || i - j);
	const axes = order.map((i) => axesAll[i]);
	const half = order.map((i) => (ranges[i][1] - ranges[i][0]) / 2) as [number, number, number];
	const mid = order.map((i) => (ranges[i][1] + ranges[i][0]) / 2);
	const ox = axes[0][0] * mid[0] + axes[1][0] * mid[1] + axes[2][0] * mid[2];
	const oy = axes[0][1] * mid[0] + axes[1][1] * mid[1] + axes[2][1] * mid[2];
	const oz = axes[0][2] * mid[0] + axes[1][2] * mid[1] + axes[2][2] * mid[2];

	// Convex: every corner behind every face's plane
	const tolerance = Math.max(eps * 10, radius * 1e-4);
	let convex = true;
	for (const [nx, ny, nz, d] of faceNormals) {
		for (let i = 0; i < points.length && convex; i += 3) {
			if (nx * points[i] + ny * points[i + 1] + nz * points[i + 2] - d > tolerance) convex = false;
		}
		if (!convex) break;
	}

	return { index, solid, cx, cy, cz, radius, axes, half, ox, oy, oz, convex, volume };
}

function extent (points: number[], x: number, y: number, z: number): [number, number] {
	let lo = Infinity, hi = -Infinity;
	for (let i = 0; i < points.length; i += 3) {
		const d = points[i] * x + points[i + 1] * y + points[i + 2] * z;
		if (d < lo) lo = d;
		if (d > hi) hi = d;
	}
	return [lo, hi];
}

/** How far a point is from a solid's axis-aligned box (0 inside it). */
function boxDistance (p: IgeFractureVec3, solid: Solid): number {
	const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
	for (const face of solid) {
		for (const v of face.v) {
			for (let k = 0; k < 3; k++) {
				if (v[k] < lo[k]) lo[k] = v[k];
				if (v[k] > hi[k]) hi[k] = v[k];
			}
		}
	}
	const q = [p.x, p.y, p.z];
	let sum = 0;
	for (let k = 0; k < 3; k++) {
		const d = q[k] < lo[k] ? lo[k] - q[k] : q[k] > hi[k] ? q[k] - hi[k] : 0;
		sum += d * d;
	}
	return Math.sqrt(sum);
}

/** How far a point is from a part's box (0 inside it). */
function distanceToPart (p: IgeFractureVec3, part: Part): number {
	const dx = p.x - part.ox, dy = p.y - part.oy, dz = p.z - part.oz;
	let sum = 0;
	for (let k = 0; k < 3; k++) {
		const a = part.axes[k];
		const along = Math.abs(dx * a[0] + dy * a[1] + dz * a[2]) - part.half[k];
		if (along > 0) sum += along * along;
	}
	return Math.sqrt(sum);
}

/** The pattern a part breaks with. */
function partPattern (part: Part, pattern: IgeFracturePattern, glass: boolean): "voronoi" | "slab" | "glass" | "planks" | "whole" {
	const [thin, mid, long] = part.half;
	const isThin = thin < mid * 0.25;
	const isLong = long >= mid * 3;
	switch (pattern) {
		case "voronoi": return "voronoi";
		case "slab": return isThin ? "slab" : "voronoi";
		case "glass": return isThin ? "glass" : "voronoi";
		case "planks": return isLong ? "planks" : "whole";
		default:
			if (glass && isThin) return "glass";
			if (isLong) return "planks";
			if (isThin) return "slab";
			return "voronoi";
	}
}

/* Cutting */

/**
 * The part of a convex solid where n.p <= d, its cut capped. The solid
 * itself when the plane misses it, null when nothing is left.
 */
function clip (solid: Solid, nx: number, ny: number, nz: number, d: number, cap: CapStyle, stats: { cuts: number }): Solid | null {
	const eps = cap.eps;
	let anyOut = false, anyIn = false;
	for (const face of solid) {
		for (const p of face.v) {
			const s = nx * p[0] + ny * p[1] + nz * p[2] - d;
			if (s > eps) anyOut = true;
			else if (s < -eps) anyIn = true;
		}
	}
	if (!anyOut) return solid;
	if (!anyIn) return null;
	stats.cuts++;

	const result: Solid = [];
	const capPoints: V[] = [];
	const dist: number[] = [];
	for (const face of solid) {
		const v = face.v, n = v.length;
		dist.length = n;
		for (let i = 0; i < n; i++) dist[i] = nx * v[i][0] + ny * v[i][1] + nz * v[i][2] - d;
		const kept: V[] = [];
		for (let i = 0; i < n; i++) {
			const j = i + 1 < n ? i + 1 : 0;
			const sa = dist[i], sb = dist[j];
			if (sa <= eps) {
				kept.push(v[i]);
				if (sa >= -eps) capPoints.push(v[i]);
			}
			if ((sa < -eps && sb > eps) || (sa > eps && sb < -eps)) {
				// Always from the kept corner to the cut one, so both faces sharing the edge get the same point
				const p = sa < 0 ? lerp(v[i], v[j], sa / (sa - sb)) : lerp(v[j], v[i], sb / (sb - sa));
				kept.push(p);
				capPoints.push(p);
			}
		}
		if (kept.length >= 3) result.push({ v: kept, inside: face.inside });
	}
	const capFace = makeCap(capPoints, nx, ny, nz, cap);
	if (capFace) result.push(capFace);
	return result.length >= 4 ? result : null;
}

function lerp (a: V, b: V, t: number): V {
	const out: V = new Array(12);
	for (let i = 0; i < 12; i++) out[i] = a[i] + (b[i] - a[i]) * t;
	const len = Math.sqrt(out[3] * out[3] + out[4] * out[4] + out[5] * out[5]);
	if (len > 0) {
		out[3] /= len; out[4] /= len; out[5] /= len;
	}
	return out;
}

/** The cut face: the points where the plane crossed the solid, round their centre, facing +n. */
function makeCap (points: V[], nx: number, ny: number, nz: number, cap: CapStyle): Face | null {
	const eps2 = cap.eps * cap.eps * 4;
	const unique: V[] = [];
	outer: for (const p of points) {
		for (const q of unique) {
			const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
			if (dx * dx + dy * dy + dz * dz <= eps2) continue outer;
		}
		unique.push(p);
	}
	if (unique.length < 3) return null;
	const ordered = orderRound(unique, nx, ny, nz);
	const verts: V[] = [];
	for (const p of ordered) {
		const out: V = [p[0], p[1], p[2], nx, ny, nz, 0, 0, cap.r, cap.g, cap.b, cap.a];
		planarUv(out, nx, ny, nz, cap.uvScale);
		verts.push(out);
	}
	return { v: verts, inside: true };
}

/** A number that rises with the angle of (x, y) round the origin, 0 to 4, from arithmetic only. */
function pseudoAngle (x: number, y: number): number {
	if (x === 0 && y === 0) return 0;
	if (y >= 0) return x >= 0 ? y / (x + y) : 1 - x / (-x + y);
	return x < 0 ? 2 - y / (-x - y) : 3 + x / (x - y);
}

/** A unit 2D direction from a pseudo-angle (0 to 4 round the circle). */
function directionAt (p: number): [number, number] {
	p = p - Math.floor(p / 4) * 4;
	let x: number, y: number;
	if (p < 1) {
		x = 1 - p; y = p;
	} else if (p < 2) {
		x = 1 - p; y = 2 - p;
	} else if (p < 3) {
		x = p - 3; y = 2 - p;
	} else {
		x = p - 3; y = p - 4;
	}
	const len = Math.sqrt(x * x + y * y);
	return [x / len, y / len];
}

/* Voronoi */

function voronoiSites (rng: () => number, count: number, mesh: SourceMesh, focus: IgeFractureVec3, radius: number, focusShare: number): number[] {
	const [x0, y0, z0] = mesh.min, [x1, y1, z1] = mesh.max;
	const shrink = mesh.diagonal * 0.005;
	const minGap2 = (mesh.diagonal * 0.02) * (mesh.diagonal * 0.02);
	const sites: number[] = [];
	for (let tries = 0; sites.length < count * 3 && tries < count * 40; tries++) {
		let x: number, y: number, z: number;
		if (rng() < focusShare) {
			// In a ball round the hit, denser near its middle
			let bx: number, by: number, bz: number, l2: number;
			do {
				bx = rng() * 2 - 1; by = rng() * 2 - 1; bz = rng() * 2 - 1;
				l2 = bx * bx + by * by + bz * bz;
			} while (l2 > 1 || l2 === 0);
			const s = radius * rng();
			x = focus.x + bx * s; y = focus.y + by * s; z = focus.z + bz * s;
		} else {
			x = x0 + (x1 - x0) * rng(); y = y0 + (y1 - y0) * rng(); z = z0 + (z1 - z0) * rng();
		}
		// Clamp into the mesh's box (sites outside make empty cells)
		x = Math.min(x1 - shrink, Math.max(x0 + shrink, x));
		y = Math.min(y1 - shrink, Math.max(y0 + shrink, y));
		z = Math.min(z1 - shrink, Math.max(z0 + shrink, z));
		let close = false;
		for (let i = 0; i < sites.length; i += 3) {
			const dx = sites[i] - x, dy = sites[i + 1] - y, dz = sites[i + 2] - z;
			if (dx * dx + dy * dy + dz * dz < minGap2) {
				close = true;
				break;
			}
		}
		if (close) continue;
		sites.push(x, y, z);
		if (sites.length >= count * 3) break;
	}
	return sites;
}

/**
 * A part cut into the Voronoi cells of the sites near it. Flat: the sites
 * are put on the part's middle plane first, so cells go through its whole
 * thickness.
 */
function voronoiCells (part: Part, sites: number[], flat: boolean, cap: CapStyle, stats: { cuts: number }): { site: number; solid: Solid }[] {
	const local: number[] = [];
	const owner: number[] = [];
	const reach = part.radius * 1.15;
	const [tx, ty, tz] = part.axes[0];
	const middle = tx * part.ox + ty * part.oy + tz * part.oz;
	const minGap2 = (part.radius * 0.01) * (part.radius * 0.01);
	for (let i = 0; i < sites.length; i += 3) {
		let x = sites[i], y = sites[i + 1], z = sites[i + 2];
		const dx = x - part.cx, dy = y - part.cy, dz = z - part.cz;
		if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
		if (flat) {
			const off = tx * x + ty * y + tz * z - middle;
			x -= tx * off; y -= ty * off; z -= tz * off;
		}
		let close = false;
		for (let j = 0; j < local.length; j += 3) {
			const ex = local[j] - x, ey = local[j + 1] - y, ez = local[j + 2] - z;
			if (ex * ex + ey * ey + ez * ez < minGap2) {
				close = true;
				break;
			}
		}
		if (!close) {
			local.push(x, y, z);
			owner.push(i / 3);
		}
	}
	const n = local.length / 3;
	if (n < 2) return [{ site: owner.length ? owner[0] : 0, solid: part.solid }];

	const cells: { site: number; solid: Solid }[] = [];
	const others: { j: number; d2: number }[] = [];
	for (let i = 0; i < n; i++) {
		const sx = local[i * 3], sy = local[i * 3 + 1], sz = local[i * 3 + 2];
		others.length = 0;
		for (let j = 0; j < n; j++) {
			if (j === i) continue;
			const dx = local[j * 3] - sx, dy = local[j * 3 + 1] - sy, dz = local[j * 3 + 2] - sz;
			others.push({ j, d2: dx * dx + dy * dy + dz * dz });
		}
		others.sort((a, b) => a.d2 - b.d2 || a.j - b.j);
		let cell: Solid | null = part.solid;
		for (const { j, d2 } of others) {
			const len = Math.sqrt(d2);
			const nx = (local[j * 3] - sx) / len, ny = (local[j * 3 + 1] - sy) / len, nz = (local[j * 3 + 2] - sz) / len;
			const d = nx * (sx + local[j * 3]) / 2 + ny * (sy + local[j * 3 + 1]) / 2 + nz * (sz + local[j * 3 + 2]) / 2;
			// The part's sphere wholly on the far side: nothing of it is in this cell
			const centre = nx * part.cx + ny * part.cy + nz * part.cz - d;
			if (centre > part.radius) {
				cell = null;
				break;
			}
			if (centre < -part.radius) continue;
			cell = clip(cell, nx, ny, nz, d, cap, stats);
			if (!cell) break;
		}
		if (cell) cells.push({ site: owner[i], solid: cell });
	}
	return cells;
}

/** Which solids touch (their boxes overlapping, within a gap), as groups of indices in order. */
function touchingClusters (solids: Solid[], gap: number): number[][] {
	const boxes = solids.map((solid) => {
		const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
		for (const face of solid) {
			for (const p of face.v) {
				for (let k = 0; k < 3; k++) {
					if (p[k] < lo[k]) lo[k] = p[k];
					if (p[k] > hi[k]) hi[k] = p[k];
				}
			}
		}
		return [lo, hi];
	});
	const parent = solids.map((_, i) => i);
	const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
	for (let i = 0; i < solids.length; i++) {
		for (let j = i + 1; j < solids.length; j++) {
			const [alo, ahi] = boxes[i], [blo, bhi] = boxes[j];
			let overlap = true;
			for (let k = 0; k < 3 && overlap; k++) if (alo[k] > bhi[k] + gap || blo[k] > ahi[k] + gap) overlap = false;
			if (!overlap) continue;
			const a = find(i), b = find(j);
			if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
		}
	}
	const clusters = new Map<number, number[]>();
	for (let i = 0; i < solids.length; i++) {
		const root = find(i);
		const list = clusters.get(root);
		if (list) list.push(i);
		else clusters.set(root, [i]);
	}
	return [...clusters.values()];
}

/* Glass: radial cracks from the hit and rings round it */

function glassCells (part: Part, point: IgeFractureVec3, count: number, rng: () => number, cap: CapStyle, stats: { cuts: number }): Solid[] {
	const [nx, ny, nz] = part.axes[0];
	const [ux, uy, uz] = part.axes[2];
	const [vx, vy, vz] = part.axes[1];
	// The hit on the pane's middle plane
	const off = nx * (point.x - part.ox) + ny * (point.y - part.oy) + nz * (point.z - part.oz);
	const qx = point.x - nx * off, qy = point.y - ny * off, qz = point.z - nz * off;
	const span = Math.max(part.half[1], part.half[2]) * 2;

	const rays = Math.max(5, Math.min(10, Math.round(count * 0.5)));
	const rings = Math.max(2, Math.min(3, Math.round(count / 8)));
	const turn = rng() * 4 / rays;
	const dirs: [number, number][] = [];
	for (let k = 0; k < rays; k++) dirs.push(directionAt(turn + (k + (rng() - 0.5) * 0.7) * 4 / rays));

	// Ring corners on each ray, a little uneven
	const radii: number[][] = [];
	let r = span * 0.05;
	for (let m = 0; m < rings; m++) {
		const row: number[] = [];
		for (let k = 0; k < rays; k++) row.push(r * (0.8 + rng() * 0.45));
		radii.push(row);
		r *= 2.3;
	}

	const to3 = (x: number, y: number): [number, number, number] => [qx + ux * x + vx * y, qy + uy * x + vy * y, qz + uz * x + vz * y];
	const plane = (ax: number, ay: number, px: number, py: number): [number, number, number, number] => {
		// In-plane normal (ax, ay) through (px, py): keep a . x <= a . p
		const wx = ux * ax + vx * ay, wy = uy * ax + vy * ay, wz = uz * ax + vz * ay;
		const p = to3(px, py);
		return [wx, wy, wz, wx * p[0] + wy * p[1] + wz * p[2]];
	};

	const cells: Solid[] = [];
	for (let k = 0; k < rays; k++) {
		const k2 = (k + 1) % rays;
		const [ax, ay] = dirs[k], [bx, by] = dirs[k2];
		for (let m = 0; m <= rings; m++) {
			const planes: [number, number, number, number][] = [];
			// Anticlockwise of ray k, clockwise of ray k + 1
			planes.push(plane(ay, -ax, 0, 0));
			planes.push(plane(-by, bx, 0, 0));
			if (m > 0) {
				// Beyond ring m - 1: the normal points back towards the hit
				const pax = ax * radii[m - 1][k], pay = ay * radii[m - 1][k];
				const pbx = bx * radii[m - 1][k2], pby = by * radii[m - 1][k2];
				let cx = pby - pay, cy = -(pbx - pax);
				if (cx * -pax + cy * -pay < 0) {
					cx = -cx; cy = -cy;
				}
				const len = Math.sqrt(cx * cx + cy * cy);
				planes.push(plane(cx / len, cy / len, pax, pay));
			}
			if (m < rings) {
				// Inside ring m: the normal points away from the hit
				const pax = ax * radii[m][k], pay = ay * radii[m][k];
				const pbx = bx * radii[m][k2], pby = by * radii[m][k2];
				let cx = pby - pay, cy = -(pbx - pax);
				if (cx * -pax + cy * -pay > 0) {
					cx = -cx; cy = -cy;
				}
				const len = Math.sqrt(cx * cx + cy * cy);
				planes.push(plane(cx / len, cy / len, pax, pay));
			}
			let cell: Solid | null = part.solid;
			for (const [px, py, pz, d] of planes) {
				const len = Math.sqrt(px * px + py * py + pz * pz);
				cell = clip(cell, px / len, py / len, pz / len, d / len, cap, stats);
				if (!cell) break;
			}
			if (cell) cells.push(cell);
		}
	}
	return cells;
}

/* Planks: snapped across the grain near the hit */

function plankCells (part: Part, point: IgeFractureVec3, radius: number, rng: () => number, cap: CapStyle, stats: { cuts: number }): Solid[] {
	const [tx, ty, tz] = part.axes[0];
	const [wx, wy, wz] = part.axes[1];
	const [lx, ly, lz] = part.axes[2];
	const [thin, wide, long] = part.half;
	// Nearest point on the plank's long axis to the hit
	const along = lx * (point.x - part.ox) + ly * (point.y - part.oy) + lz * (point.z - part.oz);
	const s = Math.max(-long, Math.min(long, along));
	const px = part.ox + lx * s, py = part.oy + ly * s, pz = part.oz + lz * s;
	const dx = point.x - px, dy = point.y - py, dz = point.z - pz;
	const distance = Math.max(0, Math.sqrt(dx * dx + dy * dy + dz * dz) - wide);
	const damage = 1 - distance / radius;
	const cuts: [number, number, number, number][] = [];
	// Lightly hit: it only comes loose. Harder: it snaps once or twice
	if (damage > 0.35) {
		const snaps = 1 + (damage > 0.7 && rng() < damage ? 1 : 0);
		const end = long * 0.82;
		for (let i = 0; i < snaps; i++) {
			const at = Math.max(-end, Math.min(end, s + (rng() - 0.5) * long * (0.9 - damage * 0.4)));
			// Slanted across the plank: a splintered break, not a saw cut
			let nx = lx + wx * (rng() - 0.5) * 1.4 + tx * (rng() - 0.5) * 0.5;
			let ny = ly + wy * (rng() - 0.5) * 1.4 + ty * (rng() - 0.5) * 0.5;
			let nz = lz + wz * (rng() - 0.5) * 1.4 + tz * (rng() - 0.5) * 0.5;
			const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
			nx /= len; ny /= len; nz /= len;
			const cx = part.ox + lx * at, cy = part.oy + ly * at, cz = part.oz + lz * at;
			cuts.push([nx, ny, nz, nx * cx + ny * cy + nz * cz]);
		}
		// Wide boards near the hit split along the grain too
		if (wide > thin * 2.5 && rng() < (damage - 0.35) * 0.8) {
			const off = (rng() - 0.5) * wide * 0.8;
			let nx = wx + lx * (rng() - 0.5) * 0.08, ny = wy + ly * (rng() - 0.5) * 0.08, nz = wz + lz * (rng() - 0.5) * 0.08;
			const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
			nx /= len; ny /= len; nz /= len;
			const cx = part.ox + wx * off, cy = part.oy + wy * off, cz = part.oz + wz * off;
			cuts.push([nx, ny, nz, nx * cx + ny * cy + nz * cz]);
		}
	}
	let pieces: Solid[] = [part.solid];
	for (const [nx, ny, nz, d] of cuts) {
		const next: Solid[] = [];
		for (const piece of pieces) {
			const below = clip(piece, nx, ny, nz, d, cap, stats);
			const above = below === piece ? null : clip(piece, -nx, -ny, -nz, -d, cap, stats);
			if (below) next.push(below);
			if (above) next.push(above);
		}
		pieces = next;
	}
	return pieces;
}

/* Pieces */

function buildPiece (solid: Solid, part: number, index: number, eps: number): IgeFracturePiece | null {
	// Faces with corners in a straight line are fanned from their middle (no slivers of no area)
	const centred: boolean[] = [];
	const skip: boolean[] = [];
	let vertexCount = 0, triangleCount = 0, insideTriangles = 0;
	for (const face of solid) {
		const v = face.v, n = v.length;
		let straight = false;
		for (let i = 0; i < n && !straight; i++) {
			const a = v[i === 0 ? n - 1 : i - 1], b = v[i], c = v[i + 1 < n ? i + 1 : 0];
			const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
			const e2x = c[0] - b[0], e2y = c[1] - b[1], e2z = c[2] - b[2];
			const x = e1y * e2z - e1z * e2y, y = e1z * e2x - e1x * e2z, z = e1x * e2y - e1y * e2x;
			const l1 = e1x * e1x + e1y * e1y + e1z * e1z, l2 = e2x * e2x + e2y * e2y + e2z * e2z;
			if (x * x + y * y + z * z <= 1e-12 * l1 * l2) straight = true;
		}
		const centre = straight && n > 3;
		// A triangle of no area is left out
		skip.push(straight && n === 3);
		centred.push(centre);
		if (straight && n === 3) continue;
		vertexCount += n + (centre ? 1 : 0);
		const tris = centre ? n : n - 2;
		triangleCount += tris;
		if (face.inside) insideTriangles += tris;
	}
	if (triangleCount < 4) return null;

	// Volume and centre of mass, from tetrahedra to the first corner
	const r = solid[0].v[0];
	let six = 0, mx = 0, my = 0, mz = 0;
	for (const face of solid) {
		const v = face.v, a = v[0];
		for (let i = 1; i + 1 < v.length; i++) {
			const b = v[i], c = v[i + 1];
			const t = tetra(r, a, b, c);
			six += t;
			mx += t * (r[0] + a[0] + b[0] + c[0]);
			my += t * (r[1] + a[1] + b[1] + c[1]);
			mz += t * (r[2] + a[2] + b[2] + c[2]);
		}
	}
	if (six <= 0) return null;
	const cx = mx / (six * 4), cy = my / (six * 4), cz = mz / (six * 4);

	const vertices = new Float32Array(vertexCount * 3);
	const normals = new Float32Array(vertexCount * 3);
	const uvs = new Float32Array(vertexCount * 2);
	const colors = new Float32Array(vertexCount * 4);
	const indices = vertexCount > 65535 ? new Uint32Array(triangleCount * 3) : new Uint16Array(triangleCount * 3);
	const hullPoints: number[] = [];
	const eps2 = eps * eps * 4;
	const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
	let at = 0, ti = 0;
	const put = (p: V) => {
		const x = p[0] - cx, y = p[1] - cy, z = p[2] - cz;
		vertices[at * 3] = x; vertices[at * 3 + 1] = y; vertices[at * 3 + 2] = z;
		normals[at * 3] = p[3]; normals[at * 3 + 1] = p[4]; normals[at * 3 + 2] = p[5];
		uvs[at * 2] = p[6]; uvs[at * 2 + 1] = p[7];
		colors[at * 4] = p[8]; colors[at * 4 + 1] = p[9]; colors[at * 4 + 2] = p[10]; colors[at * 4 + 3] = p[11];
		at++;
	};
	solid.forEach((face, f) => {
		const v = face.v, n = v.length;
		if (skip[f]) return;
		const base = at;
		for (const p of v) {
			put(p);
			const x = p[0] - cx, y = p[1] - cy, z = p[2] - cz;
			if (x < lo[0]) lo[0] = x;
			if (y < lo[1]) lo[1] = y;
			if (z < lo[2]) lo[2] = z;
			if (x > hi[0]) hi[0] = x;
			if (y > hi[1]) hi[1] = y;
			if (z > hi[2]) hi[2] = z;
			let seen = false;
			for (let i = 0; i < hullPoints.length; i += 3) {
				const dx = hullPoints[i] - x, dy = hullPoints[i + 1] - y, dz = hullPoints[i + 2] - z;
				if (dx * dx + dy * dy + dz * dz <= eps2) {
					seen = true;
					break;
				}
			}
			if (!seen) hullPoints.push(x, y, z);
		}
		if (centred[f]) {
			// A middle corner: the average of the face's corners
			const middle: V = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
			for (const p of v) for (let k = 0; k < 12; k++) middle[k] += p[k];
			for (let k = 0; k < 12; k++) middle[k] /= n;
			const len = Math.sqrt(middle[3] * middle[3] + middle[4] * middle[4] + middle[5] * middle[5]);
			if (len > 0) {
				middle[3] /= len; middle[4] /= len; middle[5] /= len;
			}
			const centre = at;
			put(middle);
			for (let i = 0; i < n; i++) {
				indices[ti++] = centre;
				indices[ti++] = base + i;
				indices[ti++] = base + (i + 1 < n ? i + 1 : 0);
			}
		} else {
			for (let i = 1; i + 1 < n; i++) {
				indices[ti++] = base;
				indices[ti++] = base + i;
				indices[ti++] = base + i + 1;
			}
		}
	});
	return {
		index,
		part,
		big: false,
		volume: six / 6,
		centre: { x: cx, y: cy, z: cz },
		halfExtents: { x: Math.max(-lo[0], hi[0]), y: Math.max(-lo[1], hi[1]), z: Math.max(-lo[2], hi[2]) },
		vertices: at * 3 === vertices.length ? vertices : vertices.slice(0, at * 3),
		normals: at * 3 === normals.length ? normals : normals.slice(0, at * 3),
		uvs: at * 2 === uvs.length ? uvs : uvs.slice(0, at * 2),
		colors: at * 4 === colors.length ? colors : colors.slice(0, at * 4),
		indices: ti === indices.length ? indices : indices.slice(0, ti),
		hull: new Float32Array(hullPoints),
		insideTriangles
	};
}

/** Convex pieces joined into one piece round their common centre of mass, keeping each one's hull. */
function mergePieces (list: IgeFracturePiece[], eps: number): IgeFracturePiece {
	let volume = 0, cx = 0, cy = 0, cz = 0, vertexCount = 0, indexCount = 0, insideTriangles = 0;
	for (const piece of list) {
		volume += piece.volume;
		cx += piece.volume * piece.centre.x; cy += piece.volume * piece.centre.y; cz += piece.volume * piece.centre.z;
		vertexCount += piece.vertices.length / 3;
		indexCount += piece.indices.length;
		insideTriangles += piece.insideTriangles;
	}
	cx /= volume; cy /= volume; cz /= volume;
	const vertices = new Float32Array(vertexCount * 3), normals = new Float32Array(vertexCount * 3);
	const uvs = new Float32Array(vertexCount * 2), colors = new Float32Array(vertexCount * 4);
	const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
	const hulls: Float32Array[] = [];
	const all: number[] = [];
	const eps2 = eps * eps * 4;
	const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
	let at = 0, ii = 0;
	for (const piece of list) {
		const ox = piece.centre.x - cx, oy = piece.centre.y - cy, oz = piece.centre.z - cz;
		const count = piece.vertices.length / 3;
		for (let i = 0; i < count; i++) {
			const x = piece.vertices[i * 3] + ox, y = piece.vertices[i * 3 + 1] + oy, z = piece.vertices[i * 3 + 2] + oz;
			vertices[(at + i) * 3] = x; vertices[(at + i) * 3 + 1] = y; vertices[(at + i) * 3 + 2] = z;
			if (x < lo[0]) lo[0] = x;
			if (y < lo[1]) lo[1] = y;
			if (z < lo[2]) lo[2] = z;
			if (x > hi[0]) hi[0] = x;
			if (y > hi[1]) hi[1] = y;
			if (z > hi[2]) hi[2] = z;
		}
		normals.set(piece.normals, at * 3);
		uvs.set(piece.uvs, at * 2);
		colors.set(piece.colors, at * 4);
		for (let i = 0; i < piece.indices.length; i++) indices[ii++] = piece.indices[i] + at;
		at += count;
		const hull = new Float32Array(piece.hull.length);
		for (let i = 0; i < hull.length; i += 3) {
			hull[i] = piece.hull[i] + ox; hull[i + 1] = piece.hull[i + 1] + oy; hull[i + 2] = piece.hull[i + 2] + oz;
			let seen = false;
			for (let j = 0; j < all.length; j += 3) {
				const dx = all[j] - hull[i], dy = all[j + 1] - hull[i + 1], dz = all[j + 2] - hull[i + 2];
				if (dx * dx + dy * dy + dz * dz <= eps2) {
					seen = true;
					break;
				}
			}
			if (!seen) all.push(hull[i], hull[i + 1], hull[i + 2]);
		}
		hulls.push(hull);
	}
	return {
		index: list[0].index,
		part: list[0].part,
		big: false,
		volume,
		centre: { x: cx, y: cy, z: cz },
		halfExtents: { x: Math.max(-lo[0], hi[0]), y: Math.max(-lo[1], hi[1]), z: Math.max(-lo[2], hi[2]) },
		vertices,
		normals,
		uvs,
		colors,
		indices,
		hull: new Float32Array(all),
		hulls,
		insideTriangles
	};
}

/**
 * Pre-made pieces (meshes in the prop's own space) as fracture pieces,
 * so they spawn the same way as cut ones: each is re-centred on its centre
 * of mass, with its volume and hull points worked out.
 */
export function igeFracturePieces (meshes: IgeFractureMesh[], options: { bigVolume?: number; maxBig?: number; insideColor?: IgeFractureColor } = {}): IgeFracturePiece[] {
	const pieces: IgeFracturePiece[] = [];
	for (const mesh of meshes) {
		const result = igeFracture(mesh, { seed: 0, point: { x: 0, y: 0, z: 0 }, pattern: "whole", insideColor: options.insideColor, minVolume: 0 });
		for (const piece of result.pieces) {
			piece.index = pieces.length;
			piece.part = pieces.length;
			pieces.push(piece);
		}
	}
	if (options.bigVolume !== undefined) {
		const candidates = pieces.filter((piece) => piece.volume >= options.bigVolume!);
		candidates.sort((a, b) => b.volume - a.volume || a.index - b.index);
		for (let i = 0; i < candidates.length && i < (options.maxBig ?? 8); i++) candidates[i].big = true;
	}
	return pieces;
}
