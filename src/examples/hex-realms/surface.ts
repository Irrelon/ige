import { CLOUD_BASE, CLOUD_TOP, shownTop } from "./chunkMesh";
import { UNEXPLORED } from "./fog";
import type { HexLayout } from "./hex";
import type { HexMap } from "./mapGen";
import { FLOOR_HEIGHT, hillRise, HILL_RISE, hillStepRise, LAND_HEIGHT, Relief } from "./terrain";

export type TerrainStyle = "tiles" | "natural";

/**
 * The visible ground for a terrain style. Gameplay always runs on the hex
 * grid; a surface only answers "how high is the ground here?" so units,
 * cities, overlays and mouse picking sit on whichever terrain is shown.
 */
export interface TerrainSurface {
	readonly style: TerrainStyle;
	/** Highest point anything on the terrain can reach (picking starts here). */
	readonly pickTop: number;
	/** Ground (or water surface) height under a world point. */
	heightAt (x: number, z: number): number;
	/** Height used for mouse picking (includes mountain peaks in tile style). */
	pickHeight (x: number, z: number): number;
	/** Height units and cities stand at on a tile's centre. */
	tileHeight (tile: number): number;
	/** Height for flat overlays (rings, markers) so they clear the ground across the tile. */
	overlayHeight (tile: number): number;
}

/**
 * The stylised, Polytopia-like look: every tile is a flat stepped hexagon.
 * Unexplored tiles (per the fog view) are under clouds.
 */
export class TileSurface implements TerrainSurface {
	readonly style = "tiles";
	readonly pickTop = Math.max(LAND_HEIGHT[Relief.Mountain] + 50, CLOUD_TOP);
	protected _map: HexMap;
	protected _layout: HexLayout;
	protected _view: Uint8Array;
	protected _tmp = { col: 0, row: 0 };
	/** Hills are stepped terraces (the blocky art pack) rather than smooth mounds. */
	blockyHills = false;

	constructor (map: HexMap, layout: HexLayout, view: Uint8Array) {
		this._map = map;
		this._layout = layout;
		this._view = view;
	}

	protected _tileAt (x: number, z: number): number {
		const o = this._layout.worldToOffset(x, z, this._tmp);
		return this._map.inBounds(o.col, o.row) ? this._map.index(o.col, o.row) : -1;
	}

	/** Is this an explored hill tile (drawn as a rounded hill)? */
	protected _hill (t: number): boolean {
		return this._map.relief[t] === Relief.Hills && this._view[t] !== UNEXPLORED;
	}

	/** How far (x, z) is from tile t's centre. */
	protected _dist (t: number, x: number, z: number): number {
		const m = this._map;
		return Math.hypot(x - this._layout.centerX(m.col(t), m.row(t)), z - this._layout.centerZ(m.row(t)));
	}

	heightAt (x: number, z: number): number {
		const t = this._tileAt(x, z);
		if (t < 0) return FLOOR_HEIGHT;
		const flat = shownTop(this._map, this._view, t);
		if (!this._hill(t)) return flat;
		if (this.blockyHills) {
			const m = this._map;
			return flat + hillStepRise(x - this._layout.centerX(m.col(t), m.row(t)), z - this._layout.centerZ(m.row(t)), this._layout.size);
		}
		return flat + hillRise(this._dist(t, x, z), this._layout.size);
	}

	pickHeight (x: number, z: number): number {
		const t = this._tileAt(x, z);
		if (t < 0) return FLOOR_HEIGHT;
		if (this._view[t] === UNEXPLORED) return CLOUD_BASE + 14; // the middle of the puffs
		if (this._map.relief[t] === Relief.Mountain) return this._map.topHeight(t) + 40;
		return this.heightAt(x, z);
	}

	/** Units and cities stand on a hill's crown. */
	tileHeight (tile: number): number {
		return shownTop(this._map, this._view, tile) + (this._hill(tile) ? HILL_RISE : 0);
	}

	/** Rings around a tile's edge sit at land level (a hill is back down there); over clouds they float above the puffs. */
	overlayHeight (tile: number): number {
		return this._view[tile] === UNEXPLORED ? CLOUD_TOP : shownTop(this._map, this._view, tile);
	}
}
