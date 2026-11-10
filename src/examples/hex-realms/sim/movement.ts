import { Feature, Relief, Terrain } from "../terrain";
import { riverBetween } from "../rivers";
import { fail, ok } from "./result";
import type { Sim } from "./sim";
import type { CommandResult, UnitState } from "./types";

/**
 * Movement rules:
 * - Moving onto flat land costs 1, hills or woods 2, and 0.5 between two
 *   road (or city) tiles. A unit with any moves left may always take one more
 *   step; if the step costs more than it has, the step ends its move.
 * - Mountains are impassable. Water needs Sailing (coast) or Navigation
 *   (deep ocean); embarking or landing ends the unit's move.
 * - Units can't share tiles. They may pass through friendly (own or allied)
 *   units but not other units, and must stop when entering a tile next to an
 *   enemy they can see (zone of control).
 * - At peace, a civ's territory is closed unless it has granted open borders
 *   (or they are allies). Units already inside when it closes may go on
 *   moving within it, but once they step out they can't come back in.
 * - Players can only plan moves through tiles they have explored.
 */

export interface Reach {
	tiles: number[];
	prev: Map<number, number>;
	cost: Map<number, number>;
}

/**
 * Whether a unit may step onto a tile, coming from `from` (by default where
 * it stands), ignoring move points and other units.
 */
export function canEnter (sim: Sim, unit: UnitState, tile: number, from = unit.tile): boolean {
	const map = sim.map;
	if (!sim.knows(unit.owner, tile)) return false;
	if (map.relief[tile] === Relief.Mountain) return false;
	if (map.isWater(tile)) {
		const terrain = map.terrain[tile] as Terrain;
		if (terrain === Terrain.Ice) return false;
		if (!sim.hasTech(unit.owner, terrain === Terrain.DeepOcean ? "navigation" : "sailing")) return false;
	}
	const owner = map.owner[tile];
	if (owner >= 0 && owner !== unit.owner && !mayCross(sim, unit.owner, owner) && map.owner[from] !== owner) return false;
	const city = sim.cityOn(tile);
	if (city && city.owner >= 0 && city.owner !== unit.owner && !sim.atWar(unit.owner, city.owner)) return false;
	return true;
}

/** May a's units enter b's territory (war, alliance or open borders)? */
export function mayCross (sim: Sim, a: number, b: number): boolean {
	return sim.atWar(a, b) || sim.allied(a, b) || hasOpenBorders(sim, a, b);
}

export function hasOpenBorders (sim: Sim, a: number, b: number): boolean {
	return sim.state.diplomacy.openBorders[a * sim.playerCount + b] === 1;
}

/** Cost to step between adjacent tiles; -1 means the step ends the move (embark / land). */
export function stepCost (sim: Sim, from: number, to: number, owner = -1): number {
	const map = sim.map;
	if (map.isWater(from) !== map.isWater(to)) return -1;
	if (map.isWater(to)) return 1;
	const roadFrom = sim.roads[from] >= 0 || sim.cityAt[from] >= 0;
	const roadTo = sim.roads[to] >= 0 || sim.cityAt[to] >= 0;
	// Roads on both banks make a bridge; pack animals (Logistics) make roads quicker still
	if (roadFrom && roadTo) return owner >= 0 && sim.hasTech(owner, "logistics") ? 1 / 3 : 0.5;
	// River Folk cross rivers freely
	const ford = riverBetween(map, from, to) && (owner < 0 || sim.player(owner).civ !== "riverfolk") ? 1 : 0;
	return (map.relief[to] === Relief.Hills || map.feature[to] !== Feature.None ? 2 : 1) + ford;
}

/** Is there an enemy unit the owner can see next to this tile? */
export function enemyAdjacent (sim: Sim, owner: number, tile: number): boolean {
	for (let d = 0; d < 6; d++) {
		const n = sim.map.neighbor(tile, d);
		if (n < 0) continue;
		const other = sim.unitOn(n);
		if (other && other.owner !== owner && sim.atWar(owner, other.owner) && sim.canSee(owner, n)) return true;
	}
	return false;
}

/** Tiles the unit can end its move on this turn (Dijkstra over its remaining moves). */
export function reachable (sim: Sim, unit: UnitState): Reach {
	const budget = unit.attacked ? 0 : unit.moves;
	const cost = new Map<number, number>([[unit.tile, 0]]);
	const prev = new Map<number, number>();
	const open: number[] = [unit.tile];
	const tiles: number[] = [];

	while (open.length) {
		let best = 0;
		for (let k = 1; k < open.length; k++) {
			if ((cost.get(open[k]) as number) < (cost.get(open[best]) as number)) best = k;
		}
		const t = open[best];
		open.splice(best, 1);
		const c = cost.get(t) as number;
		if (c >= budget) continue;
		// Zone of control: a unit that enters a tile next to an enemy stops there
		if (t !== unit.tile && enemyAdjacent(sim, unit.owner, t)) continue;

		for (let d = 0; d < 6; d++) {
			const n = sim.map.neighbor(t, d);
			if (n < 0 || !canEnter(sim, unit, n, t)) continue;
			const blocker = sim.unitAt[n] >= 0 ? sim.unit(sim.unitAt[n]) : undefined;
			if (blocker && blocker.owner !== unit.owner && !sim.allied(unit.owner, blocker.owner)) continue;
			const step = stepCost(sim, t, n, unit.owner);
			// Embarking or landing, or a step dearer than what's left, ends the move
			const next = step < 0 ? budget : Math.min(budget, c + step);
			const known = cost.get(n);
			if (known === undefined || next < known) {
				if (known === undefined && !blocker) tiles.push(n);
				cost.set(n, next);
				prev.set(n, t);
				open.push(n);
			}
		}
	}
	return { tiles, prev, cost };
}

export function pathTo (unit: UnitState, reach: Reach, target: number): number[] {
	const path: number[] = [];
	let t: number | undefined = target;
	while (t !== undefined && t !== unit.tile) {
		path.unshift(t);
		t = reach.prev.get(t);
	}
	return t === unit.tile ? path : [];
}

export function moveCommand (sim: Sim, player: number, unitId: number, to: number): CommandResult {
	const unit = sim.unit(unitId);
	if (!unit || unit.owner !== player) return fail("Not your unit");
	if (unit.moves <= 0 || unit.attacked) return fail("No moves left");
	const reach = reachable(sim, unit);
	if (!reach.tiles.includes(to)) return fail("Can't reach that tile");
	const path = pathTo(unit, reach, to);
	const from = unit.tile;
	sim.relocateUnit(unit, to);
	unit.moves = Math.max(0, unit.moves - (reach.cost.get(to) as number));
	unit.acted = true;
	sim.emit({ type: "unitMoved", unit: unit.id, path: [from, ...path] });
	return ok();
}
