import type { Sim } from "./sim/sim";
import type { HexLayout } from "./hex";
import type { HexMap } from "./mapGen";
import { FOGGED, UNEXPLORED, VISIBLE } from "./fog";
import { fogColor, PALETTE_COLORS, type PaletteKey } from "./palette";
import { Feature, Relief, type Terrain, TERRAIN_INFO } from "./terrain";

/**
 * 2D overview of the whole map. Terrain is rendered once into an offscreen
 * image (2 x 2 pixels per tile, odd rows shifted a pixel like the hex grid);
 * territory is redrawn when borders change; units, cities and the camera's
 * view footprint are drawn on top each update.
 */
export class Minimap {
	canvas: HTMLCanvasElement;
	protected _ctx: CanvasRenderingContext2D;
	protected _terrain: HTMLCanvasElement;
	protected _territory: HTMLCanvasElement;
	protected _map: HexMap;
	protected _layout: HexLayout;
	protected _worldW: number;
	protected _worldH: number;

	constructor (canvas: HTMLCanvasElement, map: HexMap, layout: HexLayout, maxWidth: number, maxHeight: number) {
		this.canvas = canvas;
		this._map = map;
		this._layout = layout;
		this._worldW = layout.colSpacing * (map.width + 0.5);
		this._worldH = layout.rowSpacing * (map.height - 1) + layout.size * 2;

		const scale = Math.min(maxWidth / this._worldW, maxHeight / this._worldH);
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const cssW = Math.round(this._worldW * scale);
		const cssH = Math.round(this._worldH * scale);
		canvas.style.width = `${cssW}px`;
		canvas.style.height = `${cssH}px`;
		canvas.width = Math.round(cssW * dpr);
		canvas.height = Math.round(cssH * dpr);

		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Minimap needs a 2D canvas context");
		this._ctx = ctx;

		this._terrain = document.createElement("canvas");
		this._territory = document.createElement("canvas");
		for (const c of [this._terrain, this._territory]) {
			c.width = map.width * 2 + 1;
			c.height = map.height * 2;
		}
		this.renderTerrain();
	}

	/**
	 * Terrain colours; with a fog view, unexplored tiles take the `unexplored`
	 * colour (clouds or parchment, matching the terrain style) and fogged
	 * tiles are muted.
	 */
	renderTerrain (view?: Uint8Array, unexplored: "cloud" | "parchment" = "cloud"): void {
		const map = this._map;
		const ctx = this._terrain.getContext("2d") as CanvasRenderingContext2D;
		const image = ctx.createImageData(this._terrain.width, this._terrain.height);
		const [pr, pg, pb] = PALETTE_COLORS[unexplored];

		for (let t = 0; t < map.count; t++) {
			const state = view ? view[t] : VISIBLE;
			if (state === UNEXPLORED) {
				// Faint texture: alternate tiles slightly darker
				const m = (map.col(t) + map.row(t)) % 2 ? 0.96 : 1;
				this._fillTile(image, t, pr * m, pg * m, pb * m, 255);
				continue;
			}
			const relief = map.relief[t] as Relief;
			const feature = map.feature[t] as Feature;
			let key: PaletteKey = TERRAIN_INFO[map.terrain[t] as Terrain].top;
			if (relief === Relief.Mountain) key = "rock";
			else if (feature === Feature.Forest) key = "forest";
			else if (feature === Feature.Jungle) key = "jungle";
			else if (feature === Feature.Pine) key = "pine";
			const shade = relief === Relief.Hills ? 0.88 : 1;
			const base = PALETTE_COLORS[key].map((c) => c * shade);
			const [r, g, b] = state === FOGGED ? fogColor(base) : base;
			this._fillTile(image, t, r, g, b, 255);
		}
		ctx.putImageData(image, 0, 0);
	}

	renderTerritory (sim: Sim, view?: Uint8Array): void {
		const map = this._map;
		const ctx = this._territory.getContext("2d") as CanvasRenderingContext2D;
		const image = ctx.createImageData(this._territory.width, this._territory.height);
		for (let t = 0; t < map.count; t++) {
			const owner = map.owner[t];
			if (owner < 0 || (view && view[t] === UNEXPLORED)) continue;
			const css = sim.player(owner).color;
			const n = parseInt(css.slice(1), 16);
			this._fillTile(image, t, (n >> 16) & 255, (n >> 8) & 255, n & 255, 120);
		}
		ctx.putImageData(image, 0, 0);
	}

	/**
	 * Redraw: terrain, territory, cities, units and the camera footprint
	 * (world XZ points). With a fog view, cities need their tile explored and
	 * other civs' units need it visible.
	 */
	draw (sim: Sim, me: number, unitPos: (id: number) => { x: number; z: number; shown: boolean } | null, footprint: { x: number; z: number }[] | null, fogView?: Uint8Array): void {
		const ctx = this._ctx;
		const w = this.canvas.width;
		const h = this.canvas.height;
		ctx.imageSmoothingEnabled = false;
		ctx.clearRect(0, 0, w, h);
		ctx.drawImage(this._terrain, 0, 0, w, h);
		ctx.drawImage(this._territory, 0, 0, w, h);

		const map = this._map;
		const layout = this._layout;
		// Marker size follows the tile size on the minimap, within readable limits
		const dot = Math.min(4, Math.max(1.5, (w / map.width) * 0.45));

		for (const city of sim.state.cities) {
			if (fogView && fogView[city.tile] === UNEXPLORED) continue;
			const p = this.worldToMinimap(layout.centerX(map.col(city.tile), map.row(city.tile)), layout.centerZ(map.row(city.tile)));
			if (city.owner < 0) {
				// Neutral villages: a small grey dot
				ctx.fillStyle = "#3a3a3a";
				ctx.fillRect(p.x - dot * 0.9, p.y - dot * 0.9, dot * 1.8, dot * 1.8);
				ctx.fillStyle = "#c8c8c8";
				ctx.fillRect(p.x - dot * 0.6, p.y - dot * 0.6, dot * 1.2, dot * 1.2);
				continue;
			}
			ctx.fillStyle = "#fff";
			ctx.fillRect(p.x - dot * 1.6, p.y - dot * 1.6, dot * 3.2, dot * 3.2);
			ctx.fillStyle = sim.player(city.owner).color;
			ctx.fillRect(p.x - dot * 1.1, p.y - dot * 1.1, dot * 2.2, dot * 2.2);
		}

		for (const unit of sim.state.units) {
			if (fogView && unit.owner !== me && fogView[unit.tile] !== VISIBLE) continue;
			const pos = unitPos(unit.id);
			if (!pos) continue;
			const p = this.worldToMinimap(pos.x, pos.z);
			ctx.fillStyle = sim.player(unit.owner).color;
			ctx.fillRect(p.x - dot * 0.6, p.y - dot * 0.6, dot * 1.2, dot * 1.2);
		}

		if (footprint && footprint.length >= 3) {
			ctx.strokeStyle = "rgba(255,255,255,0.9)";
			ctx.lineWidth = Math.max(1, w / 260);
			ctx.beginPath();
			footprint.forEach((pt, i) => {
				const p = this.worldToMinimap(pt.x, pt.z);
				if (i === 0) ctx.moveTo(p.x, p.y);
				else ctx.lineTo(p.x, p.y);
			});
			ctx.closePath();
			ctx.stroke();
		}
	}

	/** World XZ to minimap canvas pixels. */
	worldToMinimap (x: number, z: number): { x: number; y: number } {
		return {
			x: ((x + this._layout.colSpacing / 2) / this._worldW) * this.canvas.width,
			y: ((z + this._layout.size) / this._worldH) * this.canvas.height
		};
	}

	/** CSS pixel offset within the minimap element to world XZ. */
	minimapToWorld (cssX: number, cssY: number): { x: number; z: number } {
		const rect = this.canvas.getBoundingClientRect();
		return {
			x: (cssX / rect.width) * this._worldW - this._layout.colSpacing / 2,
			z: (cssY / rect.height) * this._worldH - this._layout.size
		};
	}

	protected _fillTile (image: ImageData, t: number, r: number, g: number, b: number, a: number): void {
		const map = this._map;
		const col = map.col(t);
		const row = map.row(t);
		const x0 = col * 2 + (row & 1);
		const y0 = row * 2;
		const stride = image.width;
		for (let dy = 0; dy < 2; dy++) {
			for (let dx = 0; dx < 2; dx++) {
				const o = ((y0 + dy) * stride + x0 + dx) * 4;
				image.data[o] = r;
				image.data[o + 1] = g;
				image.data[o + 2] = b;
				image.data[o + 3] = a;
			}
		}
	}
}
