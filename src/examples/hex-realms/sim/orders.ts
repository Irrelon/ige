import { canEnter, enemyAdjacent, moveCommand, reachable, stepCost } from "./movement";
import { fail, ok } from "./result";
import { UNIT_TYPES, type UnitTypeId } from "./rules";
import type { Sim } from "./sim";
import type { CommandResult, UnitState } from "./types";

/**
 * Standing orders for units:
 *
 * - Sleep: the unit is left alone (Next Unit skips it) until an enemy comes
 *   within two tiles, when it wakes.
 * - Fortify: the unit digs in for +50% defence (+25% in a city) until it is
 *   given another order. Digging in uses the rest of its turn.
 * - Go to: the unit walks to a far tile over several turns, at the start of
 *   each of its owner's turns, stopping if the way is blocked or an enemy
 *   is next to it.
 *
 * Any other order (moving, attacking, capturing...) cancels these. Upgrades
 * turn an old unit into its successor (a warrior into a swordsman once you
 * have Smithing) inside your own territory, for stars.
 */

/** Fortified defence multiplier outside cities, and inside them (walls already help). */
export const FORTIFY_BONUS = 1.5;
export const FORTIFY_CITY_BONUS = 1.25;
/** How far away an enemy wakes a sleeping unit. */
export const WAKE_RANGE = 2;

/** What each unit type can be upgraded to. */
export const UPGRADES: Partial<Record<UnitTypeId, UnitTypeId>> = {
	warrior: "swordsman"
};

/** Has this unit a standing order (so Next Unit should leave it alone)? */
export function hasOrders (unit: UnitState): boolean {
	return !!unit.order || unit.goto !== undefined;
}

/** Can the unit still do something this turn (and has no standing order)? */
export function isReady (unit: UnitState): boolean {
	if (hasOrders(unit)) return false;
	return (unit.moves > 0 && !unit.attacked) || (!!UNIT_TYPES[unit.type].founder && !unit.acted);
}

function own (sim: Sim, player: number, unitId: number): UnitState | string {
	const unit = sim.unit(unitId);
	if (!unit || unit.owner !== player) return "Not your unit";
	return unit;
}

export function sleepProblem (sim: Sim, player: number, unitId: number): string | null {
	const unit = own(sim, player, unitId);
	if (typeof unit === "string") return unit;
	if (unit.order === "sleep") return "Already asleep";
	return null;
}

export function fortifyProblem (sim: Sim, player: number, unitId: number): string | null {
	const unit = own(sim, player, unitId);
	if (typeof unit === "string") return unit;
	if (UNIT_TYPES[unit.type].founder) return "Settlers can't fortify";
	if (sim.map.isWater(unit.tile)) return "Can't fortify at sea";
	if (unit.order === "fortify") return "Already fortified";
	if (unit.attacked) return "It has attacked this turn";
	return null;
}

export function sleepCommand (sim: Sim, player: number, unitId: number): CommandResult {
	const problem = sleepProblem(sim, player, unitId);
	if (problem) return fail(problem);
	const unit = sim.unit(unitId) as UnitState;
	unit.order = "sleep";
	unit.goto = undefined;
	sim.emit({ type: "unitChanged", unit: unit.id });
	return ok();
}

export function fortifyCommand (sim: Sim, player: number, unitId: number): CommandResult {
	const problem = fortifyProblem(sim, player, unitId);
	if (problem) return fail(problem);
	const unit = sim.unit(unitId) as UnitState;
	unit.order = "fortify";
	unit.goto = undefined;
	unit.moves = 0;
	sim.emit({ type: "unitChanged", unit: unit.id });
	return ok();
}

export function wakeCommand (sim: Sim, player: number, unitId: number): CommandResult {
	const unit = own(sim, player, unitId);
	if (typeof unit === "string") return fail(unit);
	if (!hasOrders(unit)) return fail("It has no orders");
	clearOrders(unit);
	sim.emit({ type: "unitChanged", unit: unit.id });
	return ok();
}

export function clearOrders (unit: UnitState): void {
	unit.order = undefined;
	unit.goto = undefined;
}

/** Defence multiplier from being fortified. */
export function fortifyBonus (sim: Sim, unit: UnitState): number {
	if (unit.order !== "fortify") return 1;
	const city = sim.cityOn(unit.tile);
	return city && city.owner === unit.owner ? FORTIFY_CITY_BONUS : FORTIFY_BONUS;
}

// ------------------------------------------------------------------
// Go to
// ------------------------------------------------------------------

/**
 * The cheapest route for a unit to a tile, however many turns it takes,
 * over tiles its owner knows and may enter, around foreign units (that
 * aren't allies). Embarking or landing costs a whole turn's moves. Returns
 * the tiles after the unit's own, or [] when there is no way.
 */
export function planRoute (sim: Sim, unit: UnitState, target: number, maxSteps = 4000): number[] {
	if (target === unit.tile || target < 0) return [];
	const full = UNIT_TYPES[unit.type].moves;
	const cost = new Map<number, number>([[unit.tile, 0]]);
	const prev = new Map<number, number>();
	// A small binary heap of [cost + heuristic, tile]
	const heap: [number, number][] = [[0, unit.tile]];
	const push = (item: [number, number]) => {
		heap.push(item);
		let i = heap.length - 1;
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (heap[p][0] <= heap[i][0]) break;
			[heap[p], heap[i]] = [heap[i], heap[p]];
			i = p;
		}
	};
	const pop = (): [number, number] => {
		const top = heap[0];
		const last = heap.pop() as [number, number];
		if (heap.length) {
			heap[0] = last;
			let i = 0;
			for (;;) {
				const l = i * 2 + 1, r = l + 1;
				let m = i;
				if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
				if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
				if (m === i) break;
				[heap[m], heap[i]] = [heap[i], heap[m]];
				i = m;
			}
		}
		return top;
	};
	let steps = 0;
	while (heap.length && steps++ < maxSteps) {
		const [, t] = pop();
		if (t === target) break;
		const c = cost.get(t) as number;
		for (let d = 0; d < 6; d++) {
			const n = sim.map.neighbor(t, d);
			if (n < 0 || !canEnter(sim, unit, n, t)) continue;
			const blocker = sim.unitAt[n] >= 0 ? sim.unit(sim.unitAt[n]) : undefined;
			if (blocker && blocker.owner !== unit.owner && !sim.allied(unit.owner, blocker.owner)) continue;
			const step = stepCost(sim, t, n);
			const next = c + (step < 0 ? full : step);
			const known = cost.get(n);
			if (known === undefined || next < known) {
				cost.set(n, next);
				prev.set(n, t);
				push([next + sim.distance(n, target), n]);
			}
		}
	}
	if (!prev.has(target)) return [];
	const route: number[] = [];
	for (let t: number | undefined = target; t !== undefined && t !== unit.tile; t = prev.get(t)) route.unshift(t);
	return route;
}

/** Walk a unit with a go-to order as far along its route as this turn allows. Returns false if the order was dropped. */
export function advance (sim: Sim, unit: UnitState): boolean {
	const target = unit.goto;
	if (target === undefined) return false;
	if (unit.tile === target) {
		unit.goto = undefined;
		return false;
	}
	const route = planRoute(sim, unit, target);
	if (!route.length) {
		unit.goto = undefined;
		sim.emit({ type: "orderEnded", unit: unit.id, reason: "blocked" });
		return false;
	}
	const reach = reachable(sim, unit);
	let stop = -1;
	for (const t of route) {
		if (!reach.tiles.includes(t)) break;
		stop = t;
	}
	if (stop < 0) return true;
	moveCommand(sim, unit.owner, unit.id, stop);
	const live = sim.unit(unit.id);
	if (!live) return false;
	live.goto = target;
	if (live.tile === target) {
		live.goto = undefined;
		sim.emit({ type: "orderEnded", unit: live.id, reason: "arrived" });
		return false;
	}
	if (enemyAdjacent(sim, live.owner, live.tile)) {
		live.goto = undefined;
		sim.emit({ type: "orderEnded", unit: live.id, reason: "enemy" });
		return false;
	}
	return true;
}

export function gotoProblem (sim: Sim, player: number, unitId: number, target: number): string | null {
	const unit = own(sim, player, unitId);
	if (typeof unit === "string") return unit;
	if (target === unit.tile) return "It is already there";
	if (!sim.knows(player, target)) return "You haven't explored there";
	if (!planRoute(sim, unit, target).length) return "No way to get there";
	return null;
}

export function gotoCommand (sim: Sim, player: number, unitId: number, target: number): CommandResult {
	const problem = gotoProblem(sim, player, unitId, target);
	if (problem) return fail(problem);
	const unit = sim.unit(unitId) as UnitState;
	unit.order = undefined;
	unit.goto = target;
	// Set off straight away with whatever moves are left
	if (unit.moves > 0 && !unit.attacked) advance(sim, unit);
	else sim.emit({ type: "unitChanged", unit: unit.id });
	return ok();
}

/**
 * Start of a civ's turn: sleeping units with an enemy close by wake up, and
 * units with a go-to order walk on.
 */
export function runOrders (sim: Sim, player: number, lines: string[]): void {
	let woke = 0;
	for (const u of sim.unitsOf(player)) {
		if (u.order !== "sleep") continue;
		const near = sim.tilesWithin(u.tile, WAKE_RANGE).some((t) => {
			const other = sim.unitOn(t);
			return !!other && other.owner !== player && !sim.allied(player, other.owner) && sim.canSee(player, t);
		});
		if (near) {
			u.order = undefined;
			woke++;
			sim.emit({ type: "unitChanged", unit: u.id });
		}
	}
	if (woke) lines.push(`${woke === 1 ? "A sleeping unit" : `${woke} sleeping units`} woke: enemies nearby`);
	for (const u of [...sim.unitsOf(player)]) {
		if (u.goto !== undefined && sim.unit(u.id)) advance(sim, u);
	}
}

// ------------------------------------------------------------------
// Upgrades
// ------------------------------------------------------------------

/** Stars to upgrade a unit to its successor. */
export function upgradeCost (unit: UnitState): number {
	const to = UPGRADES[unit.type];
	if (!to) return 0;
	return Math.max(2, (UNIT_TYPES[to].stars - UNIT_TYPES[unit.type].stars) * 2);
}

export function upgradeProblem (sim: Sim, player: number, unitId: number): string | null {
	const unit = own(sim, player, unitId);
	if (typeof unit === "string") return unit;
	const to = UPGRADES[unit.type];
	if (!to) return "Nothing to upgrade to";
	const tech = UNIT_TYPES[to].tech;
	if (tech && !sim.hasTech(player, tech)) return `Needs ${tech}`;
	if (sim.map.owner[unit.tile] !== player) return "Only inside your borders";
	if (unit.attacked) return "It has attacked this turn";
	if (sim.player(player).stars < upgradeCost(unit)) return `Needs ${upgradeCost(unit)} stars`;
	return null;
}

export function upgradeCommand (sim: Sim, player: number, unitId: number): CommandResult {
	const problem = upgradeProblem(sim, player, unitId);
	if (problem) return fail(problem);
	const unit = sim.unit(unitId) as UnitState;
	const to = UPGRADES[unit.type] as UnitTypeId;
	sim.player(player).stars -= upgradeCost(unit);
	const from = unit.type;
	const share = unit.hp / unit.maxHp;
	unit.type = to;
	unit.maxHp = UNIT_TYPES[to].hp;
	unit.hp = Math.max(1, Math.round(unit.maxHp * share));
	unit.moves = 0;
	unit.acted = true;
	clearOrders(unit);
	sim.emit({ type: "unitUpgraded", unit: unit.id, from, to });
	return ok();
}
