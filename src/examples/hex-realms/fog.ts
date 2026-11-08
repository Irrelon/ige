import { hexDistance } from "./hex";
import type { HexMap } from "./mapGen";
import { Feature, Relief } from "./terrain";

/**
 * Fog of war data: for every player, which tiles they have ever explored and
 * which they can see right now. This is gameplay state (the AI uses its own
 * fog to decide where to explore); how fog is *shown* to the human player is
 * decided by the fog mode (see tileView()).
 */

/** How fog is presented to the player. */
export type FogMode = "civ" | "polytopia" | "off";

/** What the viewing player sees of a tile. */
export const UNEXPLORED = 0;
export const FOGGED = 1;
export const VISIBLE = 2;

export interface SightSource {
	tile: number;
	radius: number;
}

/** Base sight radius of units and cities (line of sight adds +1 on hills). */
export const UNIT_SIGHT = 2;
export const CITY_SIGHT = 2;

/**
 * The display state of a tile for the viewer under a fog mode:
 * - civ: unexplored / explored but out of sight (fogged) / visible
 * - polytopia: unexplored / explored (always shown as visible)
 * - off: everything visible
 */
export function tileView (mode: FogMode, explored: number, visible: number): number {
	if (mode === "off") return VISIBLE;
	if (!explored) return UNEXPLORED;
	if (mode === "polytopia") return VISIBLE;
	return visible ? VISIBLE : FOGGED;
}

export class FogOfWar {
	readonly map: HexMap;
	explored: Uint8Array[] = [];
	visible: Uint8Array[] = [];
	/**
	 * Line of sight: when on, hills add +1 sight and higher or wooded tiles
	 * hide what is behind them. When off, sight is a plain radius.
	 */
	los = true;
	protected _visibleLists: number[][] = [];

	constructor (map: HexMap, players: number) {
		this.map = map;
		for (let p = 0; p < players; p++) {
			this.explored.push(new Uint8Array(map.count));
			this.visible.push(new Uint8Array(map.count));
			this._visibleLists.push([]);
		}
	}

	sightRadius (tile: number, base: number): number {
		return base + (this.los && this.map.relief[tile] === Relief.Hills ? 1 : 0);
	}

	/**
	 * Recompute what a player can see from their units and cities, exploring
	 * any newly seen tiles. Returns every tile whose explored or visible state
	 * changed, so callers only refresh what they must.
	 */
	update (player: number, sources: SightSource[]): number[] {
		const visible = this.visible[player];
		const explored = this.explored[player];
		const previous = this._visibleLists[player];
		const next: number[] = [];
		const changed: number[] = [];

		// 2 marks "visible last time"; it becomes 1 if still seen, else 0 below
		for (const t of previous) visible[t] = 2;
		for (const source of sources) {
			this.forEachInSight(source.tile, source.radius, (t) => {
				const v = visible[t];
				if (v === 1) return;
				if (v === 0) changed.push(t);
				visible[t] = 1;
				explored[t] = 1;
				next.push(t);
			});
		}
		for (const t of previous) {
			if (visible[t] === 2) {
				visible[t] = 0;
				changed.push(t);
			}
		}

		this._visibleLists[player] = next;
		return changed;
	}

	/** Explore what a tile can see without changing current visibility (AI path planning). */
	reveal (player: number, tile: number, radius: number): void {
		const explored = this.explored[player];
		this.forEachInSight(tile, radius, (t) => {
			explored[t] = 1;
		});
	}

	/** Count tiles a viewer at `tile` would see that the player hasn't explored yet. */
	unexploredInSight (player: number, tile: number, radius: number): number {
		const explored = this.explored[player];
		let count = 0;
		this.forEachInSight(tile, radius, (t) => {
			if (!explored[t]) count++;
		});
		return count;
	}

	/** Call fn for every tile within `radius` of `tile` that it can see. */
	forEachInSight (tile: number, radius: number, fn: (t: number) => void): void {
		const map = this.map;
		const col = map.col(tile);
		const row = map.row(tile);
		for (let r = row - radius; r <= row + radius; r++) {
			if (r < 0 || r >= map.height) continue;
			for (let c = col - radius - 1; c <= col + radius + 1; c++) {
				if (c < 0 || c >= map.width) continue;
				const d = hexDistance(col, row, c, r);
				if (d > radius) continue;
				const t = r * map.width + c;
				if (d <= 1 || !this.los || this.hasLineOfSight(tile, t, d)) fn(t);
			}
		}
	}

	/**
	 * Civilization-style line of sight. Each tile has an elevation (flat 0,
	 * hills 1, mountains 2); woods add 1 to how much a tile obstructs. A tile
	 * between viewer and target blocks the view when it obstructs more than
	 * the viewer's elevation. The line is traced twice, nudged to either side,
	 * and either clear line is enough, so views along tile edges aren't
	 * blocked by a corner.
	 */
	hasLineOfSight (from: number, to: number, distance: number): boolean {
		const map = this.map;
		const viewer = elevation(map, from);
		const r1 = map.row(from), r2 = map.row(to);
		const q1 = map.col(from) - (r1 - (r1 & 1)) / 2;
		const q2 = map.col(to) - (r2 - (r2 & 1)) / 2;

		for (const eps of [1e-6, -1e-6]) {
			let clear = true;
			for (let i = 1; i < distance && clear; i++) {
				const f = i / distance;
				const q = q1 + eps + (q2 - q1) * f;
				const r = r1 + eps + (r2 - r1) * f;
				const s = -q - r;
				let rq = Math.round(q);
				let rr = Math.round(r);
				const rs = Math.round(s);
				const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
				if (dq > dr && dq > ds) rq = -rr - rs;
				else if (dr > ds) rr = -rq - rs;

				const c = rq + (rr - (rr & 1)) / 2;
				if (!map.inBounds(c, rr)) continue;
				if (obstruction(map, rr * map.width + c) > viewer) clear = false;
			}
			if (clear) return true;
		}
		return false;
	}
}

function elevation (map: HexMap, t: number): number {
	const relief = map.relief[t] as Relief;
	return relief === Relief.Mountain ? 2 : relief === Relief.Hills ? 1 : 0;
}

function obstruction (map: HexMap, t: number): number {
	return elevation(map, t) + (map.feature[t] !== Feature.None ? 1 : 0);
}
