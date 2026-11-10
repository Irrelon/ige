import { addGrowth } from "./cities";
import { fail, ok } from "./result";
import { BUILDING_POP, type BuildingId, BUILDINGS, Deposit, HARVEST, POP_BOOST, TECHS } from "./rules";
import type { Sim } from "./sim";
import type { BuildingState, CityState, CommandResult } from "./types";

/**
 * Polytopia-style city growth (the buildGrowth option). Cities level up from
 * population points, which come from:
 *
 * - finishing a building in the city's land (once): BUILDING_POP, plus a
 *   workshop's bonus for each neighbouring building that feeds it (POP_BOOST);
 * - a feeder finished beside an existing workshop: the workshop's city gains
 *   that workshop's bonus too;
 * - harvesting fish or game in the city's land: stars for one-off growth, and
 *   the resource is used up (so no fishery or hunter's lodge there later);
 * - food delivered by road, as before.
 */

/** The city a building on this tile would serve (its land), if it belongs to `owner`. */
function cityFor (sim: Sim, owner: number, tile: number): CityState | undefined {
	const city = sim.city(sim.tileCity[tile]);
	return city && city.owner === owner ? city : undefined;
}

/** Finished buildings of `owner` beside a tile. */
function neighbours (sim: Sim, owner: number, tile: number): BuildingState[] {
	const out: BuildingState[] = [];
	for (const n of sim.neighbors(tile)) {
		const b = sim.buildingOn(n);
		if (b && b.built && b.owner === owner) out.push(b);
	}
	return out;
}

/** One source of population: which city gains, how much, and from where. */
export interface PopGain {
	city: CityState;
	points: number;
	tile: number;
	/** What earned it ("Sawmill", "Sawmill: 2 woodcutters"...). */
	reason: string;
}

/**
 * The population a `type` building finished at `tile` would add: to its own
 * city, and to the cities of workshops beside it that it feeds.
 */
export function buildingGains (sim: Sim, owner: number, tile: number, type: BuildingId): PopGain[] {
	if (!sim.options.buildGrowth) return [];
	const gains: PopGain[] = [];
	const near = neighbours(sim, owner, tile);
	const home = cityFor(sim, owner, tile);
	const base = BUILDING_POP[type] ?? 0;
	const boost = POP_BOOST[type];
	const feeders = boost ? near.filter((b) => boost.from.includes(b.type)).length : 0;
	const own = base + feeders * (boost?.points ?? 0);
	if (home && own > 0) gains.push({ city: home, points: own, tile, reason: feeders ? `${BUILDINGS[type].name} and ${feeders} beside it` : BUILDINGS[type].name });
	for (const w of near) {
		const wb = POP_BOOST[w.type];
		if (!wb || !wb.from.includes(type)) continue;
		const city = cityFor(sim, owner, w.tile);
		if (city) gains.push({ city, points: wb.points, tile: w.tile, reason: `${BUILDINGS[w.type].name} fed by a ${BUILDINGS[type].name.toLowerCase()}` });
	}
	return gains;
}

/** Total population a building would add (for the build menu). */
export function buildingPop (sim: Sim, owner: number, tile: number, type: BuildingId): number {
	return buildingGains(sim, owner, tile, type).reduce((n, g) => n + g.points, 0);
}

/** A building was finished: its cities grow. */
export function buildingGrowth (sim: Sim, building: BuildingState): void {
	for (const g of buildingGains(sim, building.owner, building.tile, building.type)) {
		sim.emit({ type: "population", city: g.city.id, points: g.points, tile: g.tile, reason: g.reason });
		addGrowth(sim, g.city, g.points);
	}
}

// ------------------------------------------------------------------
// Harvesting
// ------------------------------------------------------------------

/** Why the resource on this tile can't be harvested, or null. */
export function harvestProblem (sim: Sim, player: number, tile: number): string | null {
	if (!sim.options.buildGrowth) return "Not in this game";
	if (tile < 0 || tile >= sim.map.count) return "No such tile";
	const rule = HARVEST[sim.map.deposit[tile] as Deposit];
	if (!rule) return "Nothing to harvest here";
	if (sim.map.owner[tile] !== player || !cityFor(sim, player, tile)) return "Only in your own land";
	if (sim.buildingAt[tile] >= 0) return "A building stands here";
	if (!sim.hasTech(player, rule.tech)) return `Needs ${TECHS[rule.tech].name}`;
	if (sim.player(player).stars < rule.stars) return `Needs ${rule.stars} stars`;
	return null;
}

export function harvestCommand (sim: Sim, player: number, tile: number): CommandResult {
	const problem = harvestProblem(sim, player, tile);
	if (problem) return fail(problem);
	const deposit = sim.map.deposit[tile] as Deposit;
	const rule = HARVEST[deposit]!;
	const city = cityFor(sim, player, tile)!;
	sim.player(player).stars -= rule.stars;
	sim.map.deposit[tile] = Deposit.None;
	sim.emit({ type: "stars", player, amount: -rule.stars, reason: rule.name });
	sim.emit({ type: "harvested", tile, deposit, city: city.id });
	sim.emit({ type: "population", city: city.id, points: rule.pop, tile, reason: rule.name });
	addGrowth(sim, city, rule.pop);
	return ok();
}
