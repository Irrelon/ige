import type { HexMap } from "./mapGen";
import { mulberry32 } from "./noise";
import { Relief, TERRAIN_INFO, type Terrain } from "./terrain";

/**
 * Rivers run along tile edges (as in Civilization), so they never get in
 * the way of what stands in the middle of a tile. Each tile keeps a 6-bit
 * mask of which of its edges have a river (map.river; both tiles of an edge
 * set their bit).
 *
 * Corners: corner i of a tile sits between its edges i-1 and i, touching
 * neighbours n(i-1) and n(i). The same corner is corner i+2 of n(i-1) and
 * corner i+4 of n(i). From a corner, three edges lead on: the tile's edges
 * i-1 and i, and the edge between the two neighbours (edge i+1 of n(i-1)).
 *
 * A river rises near hills or mountains, well inland, and walks from corner
 * to corner downhill (toward the nearest sea, with a little meander) until
 * it reaches the coast. Generated from the map seed, so every copy of a
 * game has the same rivers.
 */

export interface RiverCourse {
	/** Corners from source to mouth, as [tile, corner]. */
	corners: [number, number][];
}

/** Is there a river along tile t's edge d? */
export function hasRiver (map: HexMap, t: number, d: number): boolean {
	return ((map.river[t] >> d) & 1) === 1;
}

/** Does a river run between two neighbouring tiles? */
export function riverBetween (map: HexMap, a: number, b: number): boolean {
	if (!map.river[a]) return false;
	for (let d = 0; d < 6; d++) if (map.neighbor(a, d) === b) return hasRiver(map, a, d);
	return false;
}

/** Does tile t have a river along any edge? */
export function riverside (map: HexMap, t: number): boolean {
	return map.river[t] !== 0;
}

/** The three tiles around corner (t, i) (-1 off the map). */
function cornerTiles (map: HexMap, t: number, i: number): [number, number, number] {
	return [t, map.neighbor(t, (i + 5) % 6), map.neighbor(t, i)];
}

/** One canonical name for a corner, whichever tile it is described from. */
function cornerKey (map: HexMap, t: number, i: number): number {
	// The same corner as seen from its other tiles
	let best = t * 6 + i;
	const a = map.neighbor(t, (i + 5) % 6);
	if (a >= 0) best = Math.min(best, a * 6 + ((i + 2) % 6));
	const b = map.neighbor(t, i);
	if (b >= 0) best = Math.min(best, b * 6 + ((i + 4) % 6));
	return best;
}

function isWater (map: HexMap, t: number): boolean {
	return t < 0 || TERRAIN_INFO[map.terrain[t] as Terrain].water;
}

function setRiver (map: HexMap, t: number, d: number): void {
	const n = map.neighbor(t, d);
	map.river[t] |= 1 << d;
	if (n >= 0) map.river[n] |= 1 << ((d + 3) % 6);
}

/** Carve rivers into a generated map. Returns their courses (for drawing). */
export function addRivers (map: HexMap): RiverCourse[] {
	const count = map.count;
	// How far each tile is from water (water 0), by breadth-first search
	const far = new Int32Array(count).fill(-1);
	const queue: number[] = [];
	for (let t = 0; t < count; t++) if (isWater(map, t)) {
		far[t] = 0;
		queue.push(t);
	}
	for (let q = 0; q < queue.length; q++) {
		const t = queue[q];
		for (let d = 0; d < 6; d++) {
			const n = map.neighbor(t, d);
			if (n >= 0 && far[n] < 0) {
				far[n] = far[t] + 1;
				queue.push(n);
			}
		}
	}
	const rand = mulberry32((map.seed ^ 0x51f15e) >>> 0);
	const height = (t: number) => (t < 0 ? -1 : far[t] + (map.relief[t] === Relief.Mountain ? 1.5 : map.relief[t] === Relief.Hills ? 0.7 : 0));
	const cornerHeight = (t: number, i: number) => {
		const [a, b, c] = cornerTiles(map, t, i);
		return height(a) + height(b) + height(c);
	};

	// Sources: corners next to hills or mountains, at least three tiles from the sea, spread out
	const sources: [number, number][] = [];
	for (let t = 0; t < count; t++) {
		if (far[t] < 3 || (map.relief[t] !== Relief.Hills && map.relief[t] !== Relief.Mountain)) continue;
		sources.push([t, Math.floor(rand() * 6)]);
	}
	// Shuffle (deterministically), then keep those far enough from rivers already placed
	for (let i = sources.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[sources[i], sources[j]] = [sources[j], sources[i]];
	}
	const wanted = Math.max(1, Math.round(count / 260));
	const courses: RiverCourse[] = [];
	const near = new Uint8Array(count);
	for (const [st, si] of sources) {
		if (courses.length >= wanted) break;
		if (near[st]) continue;
		const course = walk(map, st, si, cornerHeight, rand);
		if (!course || course.length < 5) continue;
		// Mark the river and the land around it
		for (let k = 0; k < course.length - 1; k++) {
			const [t, i] = course[k];
			const [nt, ni] = course[k + 1];
			const edge = edgeBetween(map, t, i, nt, ni);
			if (edge) setRiver(map, edge[0], edge[1]);
		}
		for (const [t] of course) {
			for (let d = -1; d < 6; d++) {
				const n = d < 0 ? t : map.neighbor(t, d);
				if (n < 0) continue;
				near[n] = 1;
				for (let e = 0; e < 6; e++) {
					const m = map.neighbor(n, e);
					if (m >= 0) near[m] = 1;
				}
			}
		}
		courses.push({ corners: course });
	}
	return courses;
}

/** The three corners reachable from corner (t, i), each with the edge leading there. */
function nextCorners (map: HexMap, t: number, i: number): { corner: [number, number]; edge: [number, number] }[] {
	const out: { corner: [number, number]; edge: [number, number] }[] = [];
	out.push({ corner: [t, (i + 5) % 6], edge: [t, (i + 5) % 6] });
	out.push({ corner: [t, (i + 1) % 6], edge: [t, i] });
	const a = map.neighbor(t, (i + 5) % 6);
	if (a >= 0) out.push({ corner: [a, (i + 1) % 6], edge: [a, (i + 1) % 6] });
	return out;
}

/** The edge [tile, dir] joining two adjacent corners, or null. */
function edgeBetween (map: HexMap, t: number, i: number, nt: number, ni: number): [number, number] | null {
	const target = cornerKey(map, nt, ni);
	for (const step of nextCorners(map, t, i)) {
		if (cornerKey(map, step.corner[0], step.corner[1]) === target) return step.edge;
	}
	return null;
}

/** Walk downhill from a corner to the sea. Null if it gets stuck. */
function walk (map: HexMap, t: number, i: number, h: (t: number, i: number) => number, rand: () => number): [number, number][] | null {
	const course: [number, number][] = [[t, i]];
	const seen = new Set<number>([cornerKey(map, t, i)]);
	for (let steps = 0; steps < 200; steps++) {
		const [ct, ci] = course[course.length - 1];
		let best: [number, number] | null = null, bestH = Infinity;
		for (const step of nextCorners(map, ct, ci)) {
			const [nt, ni] = step.corner;
			const key = cornerKey(map, nt, ni);
			if (seen.has(key)) continue;
			// The river runs between two land tiles (or off the map edge: not allowed)
			const [et, ed] = step.edge;
			const other = map.neighbor(et, ed);
			if (other < 0 || isWater(map, et) || isWater(map, other)) continue;
			const hh = h(nt, ni) + rand() * 0.9;
			if (hh < bestH) {
				bestH = hh;
				best = [nt, ni];
			}
		}
		if (!best) return null;
		course.push(best);
		seen.add(cornerKey(map, best[0], best[1]));
		// Reached the coast: a corner that touches water is the river's mouth
		if (cornerTiles(map, best[0], best[1]).some((x) => isWater(map, x))) return course;
	}
	return null;
}
