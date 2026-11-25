/**
 * The example's city, generated from a seed the same way on every thread: a 10 km grid of 64 m chunks, each a block
 * between 12 m streets, built up with boxes. Towers downtown, offices round them, houses in the suburbs, a few
 * parks. Buildings have windows and ledges (small parts: what HLOD drops first), roofs and plant on top.
 *
 * Plain data and maths (metres, one world unit a metre): the worker builds meshes from it, the page only its sizes.
 */
import type { IgeMergePiece } from "@/engine/webgl/IgeGeometryMerge";
import type { IgeVertexArrays } from "@/engine/webgl/IgeVertexPacking";

/** Chunks across and their size. */
export const CELLS = 160;
export const CELL = 64;
export const STREET = 12;
/** The tallest roof (for the shadow fit and HLOD's boxes). */
export const MAX_HEIGHT = 170;
/** The world's middle (downtown). */
export const CENTRE = (CELLS * CELL) / 2;

/**
 * The camera's near plane for a height (metres): 1 m near the ground, half the height above the tallest roof up high.
 * A 24-bit depth buffer tells depths apart in steps of about d² / (near × 2^24): with the near plane left at 1 m, from
 * 4 km up the roofs (0.6 m above their buildings' tops) are a metre or more of depth apart, and fight for the same
 * pixels as the camera moves (shimmering rooftops). Nothing is nearer than the height above the roofs times the
 * cosine of the lens's widest angle (about 0.64), so half of it clips nothing.
 */
export function cameraNear (height: number): number {
	return Math.max(1, (height - MAX_HEIGHT) * 0.5);
}

/** The smallest depth a 24-bit depth buffer tells apart at `depth`, with a perspective camera's near and far planes. */
export function depthStep (near: number, far: number, depth: number): number {
	// Window depth z = (far / (far - near)) × (1 - near / depth); dz/ddepth = far × near / ((far - near) × depth²)
	return ((far - near) * depth * depth) / (far * near * 16777216);
}

/** A unit cube round the origin: 24 corners (flat faces), 12 triangles. */
export function unitCube (): IgeVertexArrays & { indices: Uint16Array } {
	const v: number[] = [], n: number[] = [], i: number[] = [];
	const faces: [number[], number[], number[]][] = [
		[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
		[[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
		[[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]
	];
	for (const [nn, u, w] of faces) {
		const base = v.length / 3;
		for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
			v.push((nn[0] + u[0] * a + w[0] * b) / 2, (nn[1] + u[1] * a + w[1] * b) / 2, (nn[2] + u[2] * a + w[2] * b) / 2);
			n.push(nn[0], nn[1], nn[2]);
		}
		// Counter-clockwise seen from outside: u x w = n
		i.push(base, base + 1, base + 2, base, base + 2, base + 3);
	}
	return { vertices: new Float32Array(v), normals: new Float32Array(n), indices: new Uint16Array(i) };
}

const CUBE = unitCube();

/** mulberry32 from a cell's coordinates and a salt. */
function random (x: number, z: number, salt: number): () => number {
	let a = (Math.imul(x, 73856093) ^ Math.imul(z, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const WALLS: [number, number, number][] = [[0.72, 0.68, 0.62], [0.62, 0.56, 0.5], [0.8, 0.78, 0.74], [0.55, 0.6, 0.66], [0.7, 0.55, 0.45], [0.86, 0.84, 0.8]];
const GLASS: [number, number, number] = [0.22, 0.3, 0.38];
const LEDGE: [number, number, number] = [0.9, 0.9, 0.88];
const ROOF: [number, number, number] = [0.35, 0.35, 0.37];
const ROAD: [number, number, number] = [0.26, 0.27, 0.28];
const PAVEMENT: [number, number, number] = [0.58, 0.58, 0.56];
const GRASS: [number, number, number] = [0.33, 0.5, 0.28];
const TREE: [number, number, number] = [0.2, 0.38, 0.18];

/** A box: its middle at (x, y + h / 2, z), w by h by d, turned `yaw` about y. */
function box (x: number, y: number, z: number, w: number, h: number, d: number, color: [number, number, number], yaw = 0, material = "city"): IgeMergePiece {
	const c = Math.cos(yaw), s = Math.sin(yaw);
	return { geometry: CUBE, material, color, matrix: [c * w, 0, -s * w, 0, 0, h, 0, 0, s * d, 0, c * d, 0, x, y + h / 2, z, 1] };
}

/** What a chunk is: a park, or up to four buildings on its lots. */
export interface CellPlan {
	park: boolean;
	buildings: { x: number; z: number; w: number; d: number; h: number; color: [number, number, number] }[];
}

/** How tall the city is round (x, z): towers in the middle, houses at the edge. */
function heightScale (x: number, z: number): number {
	const r = Math.hypot(x - CENTRE, z - CENTRE) / CENTRE;
	return r < 0.15 ? 1 : r < 0.4 ? 0.35 : r < 0.7 ? 0.14 : 0.07;
}

export function cellPlan (cx: number, cz: number): CellPlan {
	const rand = random(cx, cz, 1);
	const x0 = cx * CELL + STREET / 2, z0 = cz * CELL + STREET / 2, block = CELL - STREET;
	const park = rand() < 0.06;
	const buildings: CellPlan["buildings"] = [];
	if (!park) {
		const scale = heightScale(x0 + block / 2, z0 + block / 2);
		const lot = block / 2;
		for (let i = 0; i < 4; i++) {
			if (rand() < 0.08) continue;
			const w = lot - 3 - rand() * 5, d = lot - 3 - rand() * 5;
			const h = Math.max(6, Math.round((0.4 + rand() * 0.6) * scale * MAX_HEIGHT / 3.5) * 3.5);
			buildings.push({ x: x0 + (i % 2) * lot + lot / 2, z: z0 + Math.floor(i / 2) * lot + lot / 2, w, d, h, color: WALLS[Math.floor(rand() * WALLS.length)] });
		}
	}
	return { park, buildings };
}

/**
 * A chunk's pieces, leaving out those smaller than `minSize` across in two directions (windows, ledges, plant, trees:
 * a proxy's builder would drop them anyway; leaving them out here saves making them). `tint` multiplies every colour
 * (to show levels apart).
 */
export function cellPieces (cx: number, cz: number, minSize = 0, tint?: [number, number, number]): IgeMergePiece[] {
	const plan = cellPlan(cx, cz);
	const rand = random(cx, cz, 2);
	const pieces: IgeMergePiece[] = [];
	const x0 = cx * CELL, z0 = cz * CELL, mid = CELL / 2, block = CELL - STREET;
	// The streets round the block (half of each street is this chunk's), and the block's pavement (or grass): side by
	// side, not on top of each other, so nothing is drawn twice in one place far off
	const half = STREET / 2;
	pieces.push(box(x0 + mid, -0.3, z0 + half / 2, CELL, 0.3, half, ROAD));
	pieces.push(box(x0 + mid, -0.3, z0 + CELL - half / 2, CELL, 0.3, half, ROAD));
	pieces.push(box(x0 + half / 2, -0.3, z0 + mid, half, 0.3, block, ROAD));
	pieces.push(box(x0 + CELL - half / 2, -0.3, z0 + mid, half, 0.3, block, ROAD));
	pieces.push(box(x0 + mid, -0.3, z0 + mid, block, 0.45, block, plan.park ? GRASS : PAVEMENT));
	if (plan.park && minSize < 4) {
		for (let t = 0; t < 10; t++) {
			const x = x0 + STREET / 2 + 3 + rand() * (block - 6), z = z0 + STREET / 2 + 3 + rand() * (block - 6), s = 3 + rand() * 3;
			pieces.push(box(x, 0.15, z, s, s * 1.4, s, TREE, rand() * Math.PI));
		}
	}
	for (const b of plan.buildings) {
		pieces.push(box(b.x, 0.15, b.z, b.w, b.h, b.d, b.color));
		// A roof slab and plant
		if (minSize < Math.min(b.w, b.d) - 1) pieces.push(box(b.x, 0.15 + b.h, b.z, b.w - 1, 0.6, b.d - 1, ROOF));
		if (minSize < 3) {
			for (let k = 0; k < 2; k++) pieces.push(box(b.x + (rand() - 0.5) * b.w * 0.5, 0.75 + b.h, b.z + (rand() - 0.5) * b.d * 0.5, 2 + rand() * 2, 1.5 + rand() * 2, 2 + rand() * 2, ROOF));
		}
		// Windows (1.4 by 1.8 m) every 3 m along each face, a floor every 3.5 m; a ledge every third floor
		const windows = minSize < 1.4, ledges = minSize < 0.25;
		if (!windows && !ledges) continue;
		for (let floor = 0; floor * 3.5 + 2.5 < b.h - 1; floor++) {
			const y = 0.15 + floor * 3.5 + 1;
			for (const [nx, nz, along] of [[1, 0, b.d], [-1, 0, b.d], [0, 1, b.w], [0, -1, b.w]] as [number, number, number][]) {
				const fx = b.x + (nx * b.w) / 2, fz = b.z + (nz * b.d) / 2;
				if (windows) {
					const count = Math.floor((along - 2) / 3);
					for (let k = 0; k < count; k++) {
						const t = (k - (count - 1) / 2) * 3;
						pieces.push(nx ? box(fx + nx * 0.05, y, fz + t, 0.25, 1.8, 1.4, GLASS) : box(fx + t, y, fz + nz * 0.05, 1.4, 1.8, 0.25, GLASS));
					}
				}
				if (ledges && floor % 3 === 2) {
					pieces.push(nx ? box(fx + nx * 0.1, y + 2.3, fz, 0.3, 0.2, along, LEDGE) : box(fx, y + 2.3, fz + nz * 0.1, along, 0.2, 0.3, LEDGE));
				}
			}
		}
	}
	if (tint) {
		for (const p of pieces) {
			const c = p.color as [number, number, number];
			p.color = [c[0] * tint[0], c[1] * tint[1], c[2] * tint[2]];
		}
	}
	return pieces;
}
