import { Relief } from "../terrain";
import { attackCommand, attackTargets, preview } from "./combat";
import { pillageCommand } from "./economy";
import { moveCommand, reachable } from "./movement";
import { UPGRADES } from "./orders";
import { UNIT_TYPES, type UnitTypeId } from "./rules";
import type { Sim } from "./sim";
import { type CampState, RAIDERS, type UnitState } from "./types";

/**
 * Raider camps (the raiders option, new games), like Civilization's
 * barbarians. From turn 6, every few rounds, an outlaw camp may appear on
 * unclaimed land out of every civ's sight and away from cities, up to a cap
 * set by the map's size. Each camp sends out raiders, at most two at a time:
 * a warrior or archer early on, then whatever most civs can field (the
 * upgrade chains, as far as half the living civs have the techs). Raiders
 * attack units in reach, pillage buildings and roads they stand on, roam
 * toward the nearest civ's units and buildings near their camp, and never
 * take or enter cities. A civ's unit that walks into a camp scatters it for
 * a bounty of stars. Raiders act once a round, after the last civ, using
 * the game's own random numbers, so every copy of a game sees the same raids.
 */

/** First round a camp may appear, and how often after that. */
export const CAMP_FIRST_TURN = 6;
export const CAMP_EVERY = 4;
/** Raiders a camp keeps out at once, and the rounds between new ones. */
export const RAIDERS_PER_CAMP = 2;
export const RAID_EVERY = 4;
/** How far raiders roam from their camp, and look for prey. */
export const ROAM = 6;

/** Most camps on a map at once. */
export function campCap (sim: Sim): number {
	return Math.max(2, Math.round(sim.map.count / 500));
}

/** Stars for scattering a camp: more as the world advances. */
export function campBounty (sim: Sim): number {
	return 10 + worldTier(sim) * 3;
}

/** How advanced the world is: the tier of tech that half the living civs have reached. */
function worldTier (sim: Sim): number {
	const alive = sim.state.players.filter((p) => p.alive);
	const counts = alive.map((p) => p.techs.length).sort((a, b) => a - b);
	const median = counts[Math.floor(counts.length / 2)] ?? 0;
	return Math.min(8, Math.floor(median / 4));
}

/** The raider unit a camp sends now: up a chain of upgrades as far as most civs have the techs. */
export function raiderType (sim: Sim, ranged: boolean): UnitTypeId {
	const alive = sim.state.players.filter((p) => p.alive);
	const common = (tech: string | null) => !tech || alive.filter((p) => (p.techs as string[]).includes(tech)).length * 2 >= alive.length;
	let type: UnitTypeId = ranged ? "archer" : "warrior";
	for (let next = UPGRADES[type]; next && common(UNIT_TYPES[next].tech); next = UPGRADES[type]) type = next;
	return type;
}

export function campAt (sim: Sim, tile: number): CampState | undefined {
	return sim.state.camps.find((c) => c.tile === tile);
}

/** Can a camp stand here? Free, open, unclaimed land, away from cities and other camps, seen by no one. */
function campSite (sim: Sim, t: number): boolean {
	const map = sim.map;
	if (map.isWater(t) || map.relief[t] === Relief.Mountain || map.owner[t] >= 0) return false;
	if (sim.unitAt[t] >= 0 || sim.cityAt[t] >= 0 || sim.buildingAt[t] >= 0) return false;
	if (sim.state.cities.some((c) => sim.distance(c.tile, t) < 4)) return false;
	if (sim.state.camps.some((c) => sim.distance(c.tile, t) < 7)) return false;
	return sim.state.players.every((p) => !p.alive || !sim.canSee(p.index, t));
}

/** Once a round (after the last civ): camps appear, send out raiders, and raiders act. */
export function raidersRound (sim: Sim): void {
	if (!sim.options.raiders) return;
	const turn = sim.state.turn;
	if (turn >= CAMP_FIRST_TURN && turn % CAMP_EVERY === 0 && sim.state.camps.length < campCap(sim)) {
		// A few random tries; no camp this round if none fits
		for (let i = 0; i < 40; i++) {
			const t = Math.floor(sim.rand() * sim.map.count);
			if (!campSite(sim, t)) continue;
			const camp: CampState = { id: sim.nextId(), tile: t, nextRaid: turn + 1 };
			sim.state.camps.push(camp);
			sim.emit({ type: "campFounded", camp: camp.id, tile: t });
			break;
		}
	}
	for (const camp of sim.state.camps) {
		if (turn < camp.nextRaid) continue;
		const out = sim.state.units.filter((u) => u.owner === RAIDERS && u.camp === camp.id).length;
		if (out >= RAIDERS_PER_CAMP) continue;
		const spot = [camp.tile, ...sim.neighbors(camp.tile)].find((t) => !sim.map.isWater(t) && sim.map.relief[t] !== Relief.Mountain && sim.unitAt[t] < 0 && sim.cityAt[t] < 0);
		if (spot === undefined) continue;
		const unit = sim.createUnit(raiderType(sim, sim.rand() < 0.3), RAIDERS, spot, false);
		unit.camp = camp.id;
		camp.nextRaid = turn + RAID_EVERY + Math.floor(sim.rand() * 3);
	}
	for (const unit of [...sim.state.units]) {
		if (unit.owner !== RAIDERS || !sim.unit(unit.id)) continue;
		unit.moves = UNIT_TYPES[unit.type].moves;
		unit.attacked = false;
		unit.acted = false;
		act(sim, unit);
		const live = sim.unit(unit.id);
		// Resting raiders heal a little
		if (live && !live.acted && live.hp < live.maxHp) live.hp = Math.min(live.maxHp, live.hp + 2);
	}
}

/** One raider's turn: strike, pillage, or close on prey near its camp (or wander). */
function act (sim: Sim, unit: UnitState): void {
	if (strike(sim, unit)) return;
	// Standing on a civ's building or road: burn it
	if (sim.buildingAt[unit.tile] >= 0 || sim.roads[unit.tile] >= 0) {
		if (pillageCommand(sim, RAIDERS, unit.id).ok) return;
	}
	const camp = sim.state.camps.find((c) => c.id === unit.camp);
	const home = camp?.tile ?? unit.tile;
	// Prey: civ units and buildings near the camp
	let prey = -1, best = Infinity;
	for (const t of sim.tilesWithin(home, ROAM)) {
		const u = sim.unitOn(t);
		const b = sim.buildingOn(t);
		const target = (u && u.owner >= 0) || (b && b.owner >= 0 && sim.cityAt[t] < 0);
		if (!target) continue;
		const d = sim.distance(unit.tile, t) + (u ? 0 : 1);
		if (d < best) {
			best = d;
			prey = t;
		}
	}
	const reach = reachable(sim, unit);
	const tiles = reach.tiles.filter((t) => t !== unit.tile && sim.distance(t, home) <= ROAM);
	if (!tiles.length) return;
	let to: number;
	if (prey >= 0) {
		// As close as it can get (a building's own tile if it can reach it)
		to = tiles.reduce((a, b) => (sim.distance(b, prey) < sim.distance(a, prey) ? b : a));
		if (sim.distance(to, prey) >= sim.distance(unit.tile, prey)) to = -1;
	} else {
		to = sim.rand() < 0.5 ? tiles[Math.floor(sim.rand() * tiles.length)] : -1;
	}
	if (to < 0) return;
	moveCommand(sim, RAIDERS, unit.id, to);
	const live = sim.unit(unit.id);
	if (live) strike(sim, live);
}

/** Attack the best target in reach (raiders are reckless: an even trade will do), unless it would only get the raider killed. */
function strike (sim: Sim, unit: UnitState): boolean {
	if (unit.attacked) return false;
	let bestTile = -1, bestValue = -3;
	for (const t of attackTargets(sim, unit)) {
		const r = preview(sim, unit, sim.unitOn(t) as UnitState);
		if (r.dies && !r.kills) continue;
		const value = (r.kills ? 10 : 0) + r.damage - r.retaliation;
		if (value > bestValue) {
			bestValue = value;
			bestTile = t;
		}
	}
	return bestTile >= 0 && attackCommand(sim, RAIDERS, unit.id, bestTile).ok;
}

/** A civ's unit stepped onto a camp: it is scattered, and the civ earns the bounty. */
export function enterCamp (sim: Sim, unit: UnitState): void {
	if (unit.owner < 0 || !sim.state.camps.length) return;
	const camp = campAt(sim, unit.tile);
	if (!camp) return;
	const stars = campBounty(sim);
	sim.state.camps = sim.state.camps.filter((c) => c !== camp);
	sim.player(unit.owner).stars += stars;
	sim.emit({ type: "stars", player: unit.owner, amount: stars, reason: "Scattered a raider camp" });
	sim.emit({ type: "campCleared", camp: camp.id, tile: camp.tile, player: unit.owner, stars });
}
