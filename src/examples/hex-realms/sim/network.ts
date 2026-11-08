import { Terrain } from "../terrain";
import { type Good, type Goods, SEA_LANE_LENGTH } from "./rules";
import type { Sim } from "./sim";

/**
 * The road network: a civ's road tiles plus its cities and buildings, and
 * sea lanes between its ports. Searches over it find the nearest sources and
 * stores; store queries let cities train units from goods anywhere on their
 * network.
 */

/** Node kinds in a network: land (roads, cities, buildings), a port, and sea-lane water. */
export const LAND = 1;
export const PORT = 2;
export const SEA = 3;

// ------------------------------------------------------------------
// Road network search
// ------------------------------------------------------------------

/** Tiles in a civ's network: its roads, cities and buildings (ports marked), plus its sea lanes. */
export function networkNodes (sim: Sim, player: number): Uint8Array {
	const nodes = new Uint8Array(sim.map.count);
	for (let t = 0; t < sim.map.count; t++) if (sim.roads[t] === player) nodes[t] = LAND;
	for (const c of sim.state.cities) if (c.owner === player) nodes[c.tile] = LAND;
	for (const b of sim.state.buildings) if (b.owner === player) nodes[b.tile] = b.type === "port" ? PORT : LAND;
	for (const t of seaLanes(sim, player)) if (!nodes[t]) nodes[t] = SEA;
	return nodes;
}

/** Can this civ's ships sail on a water tile? */
export function navigable (sim: Sim, player: number, tile: number): boolean {
	if (!sim.map.isWater(tile)) return false;
	const terrain = sim.map.terrain[tile] as Terrain;
	if (terrain === Terrain.Ice) return false;
	return terrain !== Terrain.DeepOcean || sim.hasTech(player, "navigation");
}

const laneCache = new WeakMap<Sim, Map<number, { key: string; tiles: number[] }>>();

/**
 * Water tiles on the shortest sea route between each pair of a civ's ports
 * (up to SEA_LANE_LENGTH tiles). A port still being built is linked too, so
 * ships can bring its own materials. Cached until the civ's ports or
 * seafaring change.
 */
export function seaLanes (sim: Sim, player: number): number[] {
	const ports = sim.state.buildings.filter((b) => b.owner === player && b.type === "port").map((b) => b.tile).sort((a, b) => a - b);
	if (ports.length < 2) return [];
	const key = `${ports.join(",")}|${sim.hasTech(player, "navigation") ? 1 : 0}`;
	let cache = laneCache.get(sim);
	if (!cache) laneCache.set(sim, cache = new Map());
	const hit = cache.get(player);
	if (hit && hit.key === key) return hit.tiles;
	const lanes = new Set<number>();
	for (let i = 0; i < ports.length; i++) {
		// Breadth-first over water from this port's shore
		const prev = new Map<number, number>();
		const depth = new Map<number, number>();
		const queue: number[] = [];
		for (const n of sim.neighbors(ports[i])) {
			if (navigable(sim, player, n) && !prev.has(n)) {
				prev.set(n, -1);
				depth.set(n, 1);
				queue.push(n);
			}
		}
		for (let q = 0; q < queue.length; q++) {
			const t = queue[q];
			if ((depth.get(t) as number) >= SEA_LANE_LENGTH) continue;
			for (const n of sim.neighbors(t)) {
				if (prev.has(n) || !navigable(sim, player, n)) continue;
				prev.set(n, t);
				depth.set(n, (depth.get(t) as number) + 1);
				queue.push(n);
			}
		}
		for (let j = i + 1; j < ports.length; j++) {
			let best = -1;
			for (const n of sim.neighbors(ports[j])) {
				if (prev.has(n) && (best < 0 || (depth.get(n) as number) < (depth.get(best) as number))) best = n;
			}
			for (let t = best; t >= 0; t = prev.get(t) as number) lanes.add(t);
		}
	}
	const tiles = [...lanes].sort((a, b) => a - b);
	cache.set(player, { key, tiles });
	return tiles;
}

/** Breadth-first search over network nodes from a start tile; visits in distance order. */
export class NetworkSearch {
	prev: Int32Array;
	stamp: Uint32Array;
	gen = 0;
	order: number[] = [];

	constructor (count: number) {
		this.prev = new Int32Array(count);
		this.stamp = new Uint32Array(count);
	}

	run (sim: Sim, nodes: Uint8Array, start: number, maxSteps = 80, blocked?: (t: number) => boolean): number[] {
		this.gen++;
		const order = this.order;
		order.length = 0;
		if (!nodes[start]) return order;
		this.stamp[start] = this.gen;
		this.prev[start] = -1;
		order.push(start);
		const depth = new Map<number, number>([[start, 0]]);
		for (let i = 0; i < order.length; i++) {
			const t = order[i];
			const d = depth.get(t) as number;
			if (d >= maxSteps) continue;
			const here = nodes[t];
			for (let k = 0; k < 6; k++) {
				const n = sim.map.neighbor(t, k);
				if (n < 0 || !nodes[n] || this.stamp[n] === this.gen) continue;
				// Ships load and unload only at ports
				if (nodes[n] === SEA && here !== PORT && here !== SEA) continue;
				if (here === SEA && nodes[n] !== PORT && nodes[n] !== SEA) continue;
				if (blocked && blocked(n)) continue;
				this.stamp[n] = this.gen;
				this.prev[n] = t;
				depth.set(n, d + 1);
				order.push(n);
			}
		}
		return order;
	}

	/** Path from the search start to `tile` (inclusive), if it was reached. */
	pathTo (tile: number): number[] {
		if (this.stamp[tile] !== this.gen) return [];
		const path: number[] = [];
		for (let t = tile; t >= 0; t = this.prev[t]) path.push(t);
		return path.reverse();
	}
}

const searches = new WeakMap<Sim, NetworkSearch>();
export function search (sim: Sim): NetworkSearch {
	let s = searches.get(sim);
	if (!s) {
		s = new NetworkSearch(sim.map.count);
		searches.set(sim, s);
	}
	return s;
}

// ------------------------------------------------------------------
// Stores
// ------------------------------------------------------------------

/** Goods available to a city from every store connected to it by road. */
export function availableGoods (sim: Sim, player: number, tile: number): Goods {
	const nodes = networkNodes(sim, player);
	const totals: Goods = {};
	for (const store of reachableStores(sim, player, nodes, tile)) {
		for (const [g, n] of Object.entries(store) as [Good, number][]) totals[g] = (totals[g] ?? 0) + n;
	}
	return totals;
}

function reachableStores (sim: Sim, player: number, nodes: Uint8Array, tile: number): Goods[] {
	const stores: Goods[] = [];
	const visited = nodes[tile] ? search(sim).run(sim, nodes, tile) : [tile];
	for (const t of visited) {
		const city = sim.cityOn(t);
		if (city && city.owner === player) stores.push(city.store);
		const b = sim.buildingOn(t);
		if (b && b.owner === player && b.type === "warehouse" && b.built) stores.push(b.store);
	}
	return stores;
}

/** Take goods (nearest stores first); "food" takes any food. */
export function takeGoods (sim: Sim, player: number, tile: number, goods: Record<string, number>): void {
	const nodes = networkNodes(sim, player);
	const stores = reachableStores(sim, player, nodes, tile);
	for (const [good, amount] of Object.entries(goods)) {
		let left = amount;
		const kinds: Good[] = good === "food" ? ["bread", "fish", "game"] : [good as Good];
		for (const store of stores) {
			for (const k of kinds) {
				while (left > 0 && (store[k] ?? 0) > 0) {
					store[k]! -= 1;
					if (!store[k]) delete store[k];
					left--;
				}
			}
		}
	}
}

