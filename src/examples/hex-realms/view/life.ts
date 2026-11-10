import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { UNEXPLORED, VISIBLE } from "../fog";
import { CORNER_X, CORNER_Z, type HexLayout } from "../hex";
import { mulberry32 } from "../noise";
import { CUBE, ORB, PYRAMID } from "../shapes";
import { networkNodes, search } from "../sim/network";
import { BUILDINGS, type BuildingId, GOOD_INFO, type Good } from "../sim/rules";
import type { Sim } from "../sim/sim";
import type { BuildingState } from "../sim/types";
import type { TerrainSurface } from "../surface";

/**
 * The map's everyday life, in the spirit of The Settlers: little workers
 * walk the roads carrying each building's goods to its city and back, and
 * beside the buildings people work: a miner swings a pickaxe, a woodcutter
 * chops, a sawyer works a spinning saw, a fisherman walks to the shore and
 * casts, a farmer hoes, smiths hammer at anvils. Purely for show: it runs
 * all the time, whoever's turn it is, and never touches the game.
 */

type Rgb = { r: number; g: number; b: number };
/** Workers stand about 22 units tall (a tile is 100 across), small beside the soldiers. */
const FIGURE_SCALE = 1.65;
const SKIN: Rgb = { r: 0.86, g: 0.66, b: 0.5 };
const TROUSERS: Rgb = { r: 0.32, g: 0.26, b: 0.2 };
const WOOD: Rgb = { r: 0.5, g: 0.34, b: 0.2 };
const IRON: Rgb = { r: 0.62, g: 0.64, b: 0.68 };
const STRAW: Rgb = { r: 0.86, g: 0.74, b: 0.42 };
const STONE: Rgb = { r: 0.6, g: 0.58, b: 0.55 };

function mat (c: Rgb) {
	return { color: { r: c.r, g: c.g, b: c.b, a: 1 }, roughness: 0.85 };
}

/** A mesh part: geometry scaled and placed in its parent's space. */
function part (parent: IgeEntity, geometry: IgeGeometryData3d, c: Rgb, sx: number, sy: number, sz: number, x: number, y: number, z: number): IgeEntity {
	const e = new IgeEntity();
	e._geometryData = geometry;
	e._materialData = mat(c);
	e.scaleTo(sx, sy, sz).translateTo(x, y, z).mount(parent);
	return e;
}

function joint (parent: IgeEntity, x: number, y: number, z: number): IgeEntity {
	return new IgeEntity().translateTo(x, y, z).mount(parent);
}

type Tool = "pickaxe" | "axe" | "hammer" | "hoe" | "rod" | "spear" | null;

/** A little worker: legs and arms on joints so they can walk and swing. Faces +Z. */
class Figure {
	root: IgeEntity;
	body: IgeEntity;
	armL: IgeEntity;
	armR: IgeEntity;
	legL: IgeEntity;
	legR: IgeEntity;
	load: IgeEntity;
	tool: IgeEntity | null = null;
	bobber: IgeEntity | null = null;

	constructor (layer: IgeEntity, tunic: Rgb, tool: Tool, hat: boolean) {
		this.root = new IgeEntity().mount(layer);
		this.root.scaleTo(FIGURE_SCALE, FIGURE_SCALE, FIGURE_SCALE);
		this.legL = joint(this.root, 1.1, 5, 0);
		part(this.legL, CUBE, TROUSERS, 1.6, 5, 1.7, 0, -2.5, 0);
		this.legR = joint(this.root, -1.1, 5, 0);
		part(this.legR, CUBE, TROUSERS, 1.6, 5, 1.7, 0, -2.5, 0);
		this.body = joint(this.root, 0, 0, 0);
		part(this.body, CUBE, tunic, 4.2, 5.4, 2.7, 0, 7.6, 0);
		part(this.body, ORB, SKIN, 3.3, 3.3, 3.3, 0, 11.9, 0);
		if (hat) part(this.body, PYRAMID, STRAW, 4.4, 1.7, 4.4, 0, 12.8, 0);
		this.armL = joint(this.body, 2.75, 9.9, 0);
		part(this.armL, CUBE, tunic, 1.35, 4.7, 1.35, 0, -2.2, 0);
		this.armR = joint(this.body, -2.75, 9.9, 0);
		part(this.armR, CUBE, tunic, 1.35, 4.7, 1.35, 0, -2.2, 0);
		// A load on the back (a crate or sack in the good's colour)
		this.load = part(this.body, CUBE, STRAW, 3.6, 3.6, 3, 0, 8.6, -2.6);
		this.load.hide();
		if (tool) this.tool = this.makeTool(tool);
	}

	/** A tool held in the right hand, pointing forward. */
	protected makeTool (tool: Tool): IgeEntity {
		const hand = joint(this.armR, 0, -4.4, 0);
		const handle = (len: number) => part(hand, CUBE, WOOD, 0.55, 0.55, len, 0, 0, len / 2);
		switch (tool) {
			case "pickaxe":
				handle(6.5);
				part(hand, CUBE, IRON, 5, 0.7, 0.7, 0, 0, 6.3);
				break;
			case "axe":
				handle(6);
				part(hand, CUBE, IRON, 0.35, 2.2, 1.6, 0, -0.6, 5.6);
				break;
			case "hammer":
				handle(4.5);
				part(hand, CUBE, IRON, 1.6, 1.6, 2.4, 0, 0, 4.6);
				break;
			case "hoe":
				handle(8);
				part(hand, CUBE, IRON, 1.8, 2, 0.35, 0, -0.9, 7.8);
				break;
			case "rod":
				part(hand, CUBE, WOOD, 0.35, 0.35, 15, 0, 3.5, 7).rotateTo(-0.45, 0, 0);
				break;
			case "spear":
				part(hand, CUBE, WOOD, 0.45, 0.45, 13, 0, 0, 2);
				part(hand, PYRAMID, IRON, 0.9, 1.8, 0.9, 0, 0, 8.6).rotateTo(Math.PI / 2, 0, 0);
				break;
		}
		return hand;
	}

	place (x: number, y: number, z: number, yaw: number): void {
		this.root.translateTo(x, y, z).rotateTo(0, yaw, 0);
	}

	/** Walking pose at a phase (radians). */
	walk (phase: number, carrying = false): void {
		const s = Math.sin(phase);
		this.legL.rotateTo(s * 0.6, 0, 0);
		this.legR.rotateTo(-s * 0.6, 0, 0);
		// Carrying, both arms reach back to hold the load
		this.armL.rotateTo(carrying ? 0.5 : -s * 0.5, 0, 0);
		this.armR.rotateTo(carrying ? 0.5 : s * 0.5, 0, 0);
		this.body.translateTo(0, Math.abs(Math.cos(phase)) * 0.35, 0).rotateTo(0.06, 0, 0);
	}

	stand (): void {
		this.legL.rotateTo(0, 0, 0);
		this.legR.rotateTo(0, 0, 0);
		this.armL.rotateTo(0, 0, 0);
		this.body.translateTo(0, 0, 0).rotateTo(0, 0, 0);
	}

	/** A tool stroke: wind up slowly, strike fast. `k` runs 0-1 through one stroke. */
	strike (k: number): void {
		const up = k < 0.65 ? k / 0.65 : 1 - (k - 0.65) / 0.12;
		const a = -2.5 * Math.max(0, Math.min(1, up));
		this.armR.rotateTo(a, 0, 0);
		this.armL.rotateTo(a * 0.85, 0, 0);
		this.body.rotateTo(up < 0.3 && k > 0.6 ? 0.28 : 0.08 - 0.1 * up, 0, 0);
	}

	destroy (): void {
		this.root.destroy();
	}
}

/** Something animated in the world. */
interface Actor {
	x: number;
	z: number;
	update (t: number, dt: number): void;
	destroy (): void;
	show (on: boolean): void;
}

/** A worker walking a route back and forth (to the city loaded, home empty). */
class Carrier implements Actor {
	fig: Figure;
	pts: { x: number; y: number; z: number }[];
	lens: number[];
	total: number;
	speed = 22;
	offset: number;
	x: number;
	z: number;

	constructor (layer: IgeEntity, pts: { x: number; y: number; z: number }[], good: Good | null, tunic: Rgb, seed: number) {
		this.fig = new Figure(layer, tunic, null, seed % 3 === 0);
		if (good) this.fig.load._materialData = mat(hexRgb(GOOD_INFO[good].color));
		this.pts = pts;
		this.lens = [0];
		for (let i = 1; i < pts.length; i++) this.lens.push(this.lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
		this.total = this.lens[this.lens.length - 1];
		this.offset = (seed * 0.618) % 1;
		this.x = pts[0].x;
		this.z = pts[0].z;
	}

	update (t: number): void {
		const loop = this.total * 2 + 30;
		let d = (t * this.speed + this.offset * loop) % loop;
		// Out (loaded) to the city, a short pause, then home empty
		const out = d < this.total;
		if (!out) d = Math.max(0, Math.min(this.total, loop - 15 - d));
		let i = 1;
		while (i < this.lens.length - 1 && this.lens[i] < d) i++;
		const a = this.pts[i - 1], b = this.pts[i];
		const k = (d - this.lens[i - 1]) / Math.max(1e-6, this.lens[i] - this.lens[i - 1]);
		this.x = a.x + (b.x - a.x) * k;
		this.z = a.z + (b.z - a.z) * k;
		const y = a.y + (b.y - a.y) * k;
		const dir = out ? Math.atan2(b.x - a.x, b.z - a.z) : Math.atan2(a.x - b.x, a.z - b.z);
		this.fig.place(this.x, y, this.z, dir);
		if (out) this.fig.load.show();
		else this.fig.load.hide();
		this.fig.walk(t * 9 + this.offset * 6, out);
	}

	show (on: boolean): void {
		if (on) this.fig.root.show();
		else this.fig.root.hide();
	}

	destroy (): void {
		this.fig.destroy();
	}
}

type Work = "miner" | "stonecutter" | "woodcutter" | "sawyer" | "fisher" | "farmer" | "hunter" | "smith" | "porter";

const WORK: Partial<Record<BuildingId, Work>> = {
	mine: "miner",
	quarry: "stonecutter",
	woodcutter: "woodcutter",
	sawmill: "sawyer",
	fishery: "fisher",
	farm: "farmer",
	hunter: "hunter",
	pasture: "hunter",
	smelter: "smith",
	toolsmith: "smith",
	armoury: "smith",
	mint: "smith",
	steelworks: "smith",
	factory: "smith",
	electronicsWorks: "smith",
	powderMill: "porter",
	bakery: "porter",
	mill: "porter",
	warehouse: "porter",
	market: "porter"
};

/** A worker busy beside a building. */
class Worker implements Actor {
	fig: Figure;
	work: Work;
	x: number;
	z: number;
	y: number;
	yaw: number;
	/** Where the job takes them (the shore, the far end of a field). */
	tx: number;
	tz: number;
	ty: number;
	props: IgeEntity;
	blade: IgeEntity | null = null;
	offset: number;

	constructor (layer: IgeEntity, work: Work, spot: { x: number; y: number; z: number; yaw: number }, target: { x: number; y: number; z: number }, tunic: Rgb, seed: number) {
		const tool: Tool = work === "miner" ? "pickaxe" : work === "woodcutter" ? "axe" : work === "stonecutter" || work === "smith" ? "hammer" : work === "farmer" ? "hoe" : work === "fisher" ? "rod" : work === "hunter" ? "spear" : null;
		this.fig = new Figure(layer, tunic, tool, work === "farmer" || work === "fisher");
		this.work = work;
		this.x = spot.x;
		this.y = spot.y;
		this.z = spot.z;
		this.yaw = spot.yaw;
		this.tx = target.x;
		this.ty = target.y;
		this.tz = target.z;
		this.offset = (seed * 0.37) % 1;
		// The thing they work on, in front of them
		this.props = new IgeEntity().translateTo(spot.x, spot.y, spot.z).rotateTo(0, spot.yaw, 0).scaleTo(FIGURE_SCALE, FIGURE_SCALE, FIGURE_SCALE).mount(layer);
		switch (work) {
			case "miner":
				part(this.props, ORB, STONE, 7, 5, 7, 0, 1.5, 7.5);
				part(this.props, ORB, { r: 0.42, g: 0.4, b: 0.4 }, 4, 3, 4, 2.5, 1, 9);
				break;
			case "stonecutter":
				part(this.props, CUBE, STONE, 6, 4, 5, 0, 2, 7);
				break;
			case "woodcutter":
				part(this.props, CUBE, WOOD, 4, 3, 4, 0, 1.5, 7);
				part(this.props, CUBE, { r: 0.62, g: 0.45, b: 0.28 }, 9, 2.4, 2.4, -1, 1.2, 10).rotateTo(0, 0.4, 0);
				break;
			case "smith":
				part(this.props, CUBE, { r: 0.22, g: 0.22, b: 0.24 }, 4, 3.2, 2.5, 0, 1.6, 6.5);
				part(this.props, CUBE, { r: 0.3, g: 0.3, b: 0.32 }, 5.5, 1.2, 3, 0, 3.6, 6.5);
				break;
			case "sawyer": {
				// A bench, a log on it and a spinning blade
				part(this.props, CUBE, WOOD, 12, 4, 4.5, 0, 2, 7);
				part(this.props, CUBE, { r: 0.6, g: 0.42, b: 0.24 }, 14, 2.5, 2.5, 0, 5.2, 7);
				const hub = new IgeEntity().translateTo(4, 6.5, 7).mount(this.props);
				this.blade = new IgeEntity().mount(hub);
				for (let k = 0; k < 3; k++) part(this.blade, CUBE, IRON, 0.4, 7, 1.2, 0, 0, 0).rotateTo((k * Math.PI) / 3, 0, 0);
				break;
			}
		}
	}

	update (t: number): void {
		const f = this.fig;
		const time = t + this.offset * 10;
		switch (this.work) {
			case "miner":
			case "stonecutter":
			case "woodcutter":
			case "smith": {
				f.place(this.x, this.y, this.z, this.yaw);
				f.stand();
				const period = this.work === "smith" ? 0.7 : 1.15;
				f.strike((time / period) % 1);
				break;
			}
			case "sawyer": {
				f.place(this.x, this.y, this.z, this.yaw);
				f.stand();
				// Pushing the log through the saw
				const push = Math.sin(time * 4) * 0.35;
				f.armL.rotateTo(-1.1 + push, 0, 0);
				f.armR.rotateTo(-1.1 + push, 0, 0);
				f.body.rotateTo(0.12 + push * 0.2, 0, 0);
				this.blade?.rotateTo(time * 12, 0, 0);
				break;
			}
			case "fisher":
			case "farmer":
			case "hunter":
			case "porter":
				this.commute(time);
				break;
		}
	}

	/** Walk out to the target, work there a while, walk back, rest. */
	commute (time: number): void {
		const f = this.fig;
		const dist = Math.hypot(this.tx - this.x, this.tz - this.z);
		const walk = dist / 12 + 0.5;
		const stay = this.work === "fisher" ? 7 : this.work === "farmer" ? 4 : 2.5;
		const rest = 2;
		const cycle = walk * 2 + stay + rest;
		const c = time % cycle;
		const out = Math.atan2(this.tx - this.x, this.tz - this.z);
		const lerp = (k: number) => [this.x + (this.tx - this.x) * k, this.y + (this.ty - this.y) * k, this.z + (this.tz - this.z) * k];
		if (c < walk) {
			const [x, y, z] = lerp(c / walk);
			f.place(x, y, z, out);
			f.walk(time * 9, this.work === "porter");
			if (this.work === "porter") f.load.show();
		} else if (c < walk + stay) {
			f.place(this.tx, this.ty, this.tz, out);
			f.stand();
			const k = c - walk;
			if (this.work === "fisher") {
				// Cast, then wait with the rod held out
				f.armR.rotateTo(k < 0.5 ? -2.2 + k * 2 : -0.9 + Math.sin(time * 2) * 0.05, 0, 0);
			} else if (this.work === "farmer") {
				f.strike((k / 1.3) % 1);
			} else if (this.work === "porter") {
				f.load.hide();
			}
		} else if (c < walk * 2 + stay) {
			const [x, y, z] = lerp(1 - (c - walk - stay) / walk);
			f.place(x, y, z, out + Math.PI);
			f.walk(time * 9);
		} else {
			f.place(this.x, this.y, this.z, out);
			f.stand();
			f.armR.rotateTo(0, 0, 0);
		}
	}

	show (on: boolean): void {
		if (on) {
			this.fig.root.show();
			this.props.show();
		} else {
			this.fig.root.hide();
			this.props.hide();
		}
	}

	destroy (): void {
		this.fig.destroy();
		this.props.destroy();
	}
}

function hexRgb (css: string): Rgb {
	const n = parseInt(css.replace("#", ""), 16);
	return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

/** A worker's tunic: the owner's colour, softened toward homespun brown. */
function tunicFor (color: string, seed: number): Rgb {
	const c = hexRgb(color);
	const m = 0.45 + ((seed * 13) % 7) * 0.03;
	return { r: c.r * m + 0.45 * (1 - m), g: c.g * m + 0.36 * (1 - m), b: c.b * m + 0.26 * (1 - m) };
}

export class LifeView {
	layer: IgeEntity;
	actors: Actor[] = [];
	dirty = true;
	protected _lastBuild = -10;
	protected _shown = true;

	constructor (parent: IgeEntity) {
		this.layer = new IgeEntity().id("hexRealms_life").mount(parent);
	}

	clear (): void {
		for (const a of this.actors) a.destroy();
		this.actors = [];
	}

	/** Rebuild who is where (after roads, buildings or the fog changed). */
	rebuild (sim: Sim, layout: HexLayout, surface: TerrainSurface, view: Uint8Array, player: number, focus: { x: number; z: number }): void {
		this.dirty = false;
		this.clear();
		const R = layout.size;
		const cx = (t: number) => layout.centerX(sim.map.col(t), sim.map.row(t));
		const cz = (t: number) => layout.centerZ(sim.map.row(t));
		const ground = (x: number, z: number) => surface.heightAt(x, z);
		const near = (t: number) => Math.hypot(cx(t) - focus.x, cz(t) - focus.z) < R * 30;
		const shown = (t: number, owner: number) => owner === player ? view[t] !== UNEXPLORED : view[t] === VISIBLE;

		// Workers beside buildings
		const buildings = sim.state.buildings.filter((b) => b.built && WORK[b.type] && shown(b.tile, b.owner) && near(b.tile));
		for (const b of buildings.slice(0, 120)) {
			const spot = this.spotFor(sim, layout, b, ground);
			if (!spot) continue;
			const work = WORK[b.type] as Work;
			const target = work === "fisher" ? this.shoreFor(sim, layout, b, ground) : this.awayFrom(spot, R, ground, b.id);
			this.actors.push(new Worker(this.layer, work, spot, target ?? spot, tunicFor(sim.player(b.owner).color, b.id), b.id));
		}

		// Carriers on the roads: from each producing building to its nearest city
		const s = search(sim);
		const owners = new Set(buildings.map((b) => b.owner));
		let carriers = 0;
		for (const owner of owners) {
			const nodes = networkNodes(sim, owner);
			for (const b of sim.buildingsOf(owner)) {
				if (carriers >= 50) break;
				if (!b.built || !shown(b.tile, owner) || !near(b.tile)) continue;
				const outputs = Object.keys(BUILDINGS[b.type].outputs) as Good[];
				if (!outputs.length && b.type !== "mine") continue;
				const order = s.run(sim, nodes, b.tile, 40);
				const city = order.find((t) => sim.cityOn(t)?.owner === owner);
				if (city === undefined) continue;
				const path = s.pathTo(city);
				if (path.length < 2) continue;
				// Along the road: through each tile's middle, a little to one side
				const pts = path.map((t, i) => {
					const side = (i % 2 ? 1 : -1) * R * 0.06;
					const x = cx(t) + side, z = cz(t) + side * 0.5;
					return { x, y: ground(x, z) + 0.5, z };
				});
				const good = outputs[0] ?? null;
				this.actors.push(new Carrier(this.layer, pts, good, tunicFor(sim.player(owner).color, b.id + 7), b.id));
				carriers++;
			}
		}
	}

	/** Where a building's worker stands: beside it, toward a corner clear of roads. */
	protected spotFor (sim: Sim, layout: HexLayout, b: BuildingState, ground: (x: number, z: number) => number): { x: number; y: number; z: number; yaw: number } | null {
		const R = layout.size;
		const x0 = layout.centerX(sim.map.col(b.tile), sim.map.row(b.tile)), z0 = layout.centerZ(sim.map.row(b.tile));
		const rand = mulberry32(b.id * 977 + 3);
		let best = -1, bestScore = -Infinity;
		for (let i = 0; i < 6; i++) {
			// Corners sit between two edges; avoid those edges' roads
			const n1 = sim.map.neighbor(b.tile, (i + 5) % 6), n2 = sim.map.neighbor(b.tile, i);
			const roads = (n1 >= 0 && sim.roads[n1] >= 0 ? 1 : 0) + (n2 >= 0 && sim.roads[n2] >= 0 ? 1 : 0);
			const score = -roads * 2 + rand();
			if (score > bestScore) {
				bestScore = score;
				best = i;
			}
		}
		if (best < 0) return null;
		const x = x0 + CORNER_X[best] * R * 0.6, z = z0 + CORNER_Z[best] * R * 0.6;
		// Facing along the tile's edge, so the work happens beside the building
		const yaw = Math.atan2(CORNER_Z[best], -CORNER_X[best]);
		return { x, y: ground(x, z), z, yaw };
	}

	/** The nearest water edge beside a fishery. */
	protected shoreFor (sim: Sim, layout: HexLayout, b: BuildingState, ground: (x: number, z: number) => number): { x: number; y: number; z: number } | null {
		const x0 = layout.centerX(sim.map.col(b.tile), sim.map.row(b.tile)), z0 = layout.centerZ(sim.map.row(b.tile));
		for (let d = 0; d < 6; d++) {
			const n = sim.map.neighbor(b.tile, d);
			if (n >= 0 && sim.map.isWater(n)) {
				const x = (x0 + layout.centerX(sim.map.col(n), sim.map.row(n))) / 2 * 0.9 + x0 * 0.1;
				const z = (z0 + layout.centerZ(sim.map.row(n))) / 2 * 0.9 + z0 * 0.1;
				return { x, y: ground((x + x0) / 2, (z + z0) / 2), z };
			}
		}
		return null;
	}

	/** A spot a short walk away (the far end of a field, the edge of the woods). */
	protected awayFrom (spot: { x: number; y: number; z: number; yaw: number }, R: number, ground: (x: number, z: number) => number, seed: number): { x: number; y: number; z: number } {
		const a = spot.yaw + (seed % 2 ? 0.9 : -0.9);
		const x = spot.x + Math.sin(a) * R * 0.45, z = spot.z + Math.cos(a) * R * 0.45;
		return { x, y: ground(x, z), z };
	}

	/**
	 * Move everyone on. Hidden when the camera is far out (they would be
	 * specks); only those near the view's centre animate.
	 */
	update (t: number, dt: number, focus: { x: number; z: number }, distance: number, R: number): boolean {
		const show = distance < 2400;
		if (show !== this._shown) {
			this._shown = show;
			for (const a of this.actors) a.show(show);
		}
		if (!show || !this.actors.length) return false;
		const reach = distance * 1.6 + R * 4;
		let any = false;
		for (const a of this.actors) {
			if (Math.abs(a.x - focus.x) > reach || Math.abs(a.z - focus.z) > reach) continue;
			a.update(t, dt);
			any = true;
		}
		return any;
	}
}
