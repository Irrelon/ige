import { diplomacyIncome, sanctionLoss } from "./diplomacy";
import { riverside } from "../rivers";
import { linkedToCapital } from "./network";
import { isActive } from "./economy";
import { hasLegacy, hasWonder, wondersOf } from "./effects";
import { administration, BUILDINGS, FREE_UNITS, FREE_UNITS_PER_CITY, levelIncome, MODERN_TECHS, UNIT_TYPES, TECHS } from "./rules";
import type { Sim } from "./sim";
import type { CityState } from "./types";

/**
 * Stars in and out each turn: city income (by level), wonder and legacy
 * bonuses, treaties and sanctions, unit upkeep and administration. Upkeep
 * and administration keep big civs from banking thousands of stars: every
 * unit beyond a free allowance, and every city beyond the tenth, costs stars
 * every turn.
 */

export interface Income {
	cities: number;
	wonders: number;
	legacy: number;
	/** Trade agreements and cultural exchanges. */
	treaties: number;
	/** Lost to other civs' sanctions. */
	sanctions: number;
	upkeep: number;
	/** Running cities beyond the tenth. */
	admin: number;
	/** Before upkeep. */
	gross: number;
	net: number;
}

/** Stars a city earns by itself. */
export function cityIncome (sim: Sim, city: CityState): number {
	// (Polytopia's cities pay a star per level, but without upkeep that left AI treasuries in the
	// thousands by turn 60: the tapering curve stays)
	let stars = levelIncome(city.level) + (city.capital ? 1 : 0) + city.bonusIncome;
	if (city.owner < 0) return stars;
	// Later economic techs (Guilds, Banking, Railways, Computing, Fusion) pay every city
	for (const t of sim.player(city.owner).techs) stars += TECHS[t].cityStars ?? 0;
	// River Folk: a city beside a river earns a star more
	if (sim.player(city.owner).civ === "riverfolk" && riverside(sim.map, city.tile)) stars += 1;
	// Imperial Road: every city joined to the capital by road earns a star more
	if (!city.capital && hasWonder(sim, city.owner, "imperialRoad") && linkedToCapital(sim, city.owner).has(city.id)) stars += 1;
	return stars;
}

function coastal (sim: Sim, city: CityState): boolean {
	return sim.neighbors(city.tile).some((n) => sim.map.isWater(n));
}

/** Units a civ keeps for free: a base plus one per city. */
export function freeUnits (sim: Sim, player: number): number {
	return FREE_UNITS + sim.citiesOf(player).length * FREE_UNITS_PER_CITY;
}

/** Administration for the civ's cities (halved by the Founders legacy). */
export function adminCost (sim: Sim, player: number): number {
	const cost = administration(sim.citiesOf(player).length);
	return hasLegacy(sim, player, "expansion") ? Math.floor(cost / 2) : cost;
}

/** Upkeep owed this turn: each unit's upkeep, less the free allowance; doubled for modern civs. */
export function upkeep (sim: Sim, player: number): number {
	// Polytopia's cities cap armies instead (each supports level + 1 units)
	if (sim.options.polytopiaCities) return 0;
	let total = 0;
	for (const u of sim.state.units) if (u.owner === player) total += UNIT_TYPES[u.type].upkeep;
	return Math.max(0, total - freeUnits(sim, player)) * upkeepFactor(sim, player);
}

/** 2 once a civ knows MODERN_TECHS technologies, otherwise 1. */
export function upkeepFactor (sim: Sim, player: number): number {
	return sim.player(player).techs.length >= MODERN_TECHS ? 2 : 1;
}

export function income (sim: Sim, player: number): Income {
	const cities = sim.citiesOf(player);
	const p = sim.player(player);
	let fromCities = 0;
	for (const c of cities) {
		fromCities += cityIncome(sim, c);
		if (!p.human && sim.options.difficulty === "hard") fromCities += 1;
	}
	let wonders = 0;
	if (hasWonder(sim, player, "colossus")) wonders += cities.filter((c) => coastal(sim, c)).length;
	let legacy = 0;
	if (hasLegacy(sim, player, "industry")) {
		const working = sim.state.buildings.filter((b) => b.owner === player && !BUILDINGS[b.type].wonder && isActive(sim, b)).length;
		legacy += Math.floor(working / 4);
	}
	if (hasLegacy(sim, player, "wonders")) {
		const w = wondersOf(sim, player);
		legacy += 2 * (w.world + w.monuments);
	}
	const treaties = diplomacyIncome(sim, player);
	const gross = fromCities + wonders + legacy + treaties;
	const sanctions = sanctionLoss(sim, player, gross);
	const owed = upkeep(sim, player);
	const admin = adminCost(sim, player);
	return { cities: fromCities, wonders, legacy, treaties, sanctions, upkeep: owed, admin, gross, net: gross - sanctions - owed - admin };
}

/**
 * Pay a civ its income and collect upkeep. A civ that can't pay disbands its
 * newest units until it can.
 */
export function collect (sim: Sim, player: number, lines: string[]): void {
	const p = sim.player(player);
	const inc = income(sim, player);
	const earned = inc.gross - inc.sanctions;
	if (earned) {
		p.stars += earned;
		sim.emit({ type: "stars", player, amount: earned, reason: "Income" });
	}
	const disbanded: string[] = [];
	const admin = adminCost(sim, player);
	let owed = upkeep(sim, player);
	if (owed + admin > p.stars) {
		const units = sim.unitsOf(player).sort((a, b) => b.id - a.id);
		for (const u of units) {
			if (owed + admin <= p.stars || owed === 0) break;
			disbanded.push(UNIT_TYPES[u.type].name);
			sim.removeUnit(u, "disbanded");
			owed = upkeep(sim, player);
		}
	}
	if (owed > 0) {
		p.stars -= owed;
		sim.emit({ type: "stars", player, amount: -owed, reason: "Upkeep" });
	}
	const adminPaid = Math.min(admin, Math.max(0, p.stars));
	if (adminPaid > 0) {
		p.stars -= adminPaid;
		sim.emit({ type: "stars", player, amount: -adminPaid, reason: "Administration" });
	}
	const parts = [`Income: +${earned} stars`];
	if (owed) parts.push(`upkeep -${owed}`);
	if (adminPaid) parts.push(`administration -${adminPaid}`);
	if (inc.sanctions) parts.push(`(${inc.sanctions} lost to sanctions)`);
	lines.unshift(`${parts.join(", ")} (${Math.floor(p.stars)} total)`);
	if (disbanded.length) lines.push(`Couldn't pay upkeep: disbanded ${disbanded.join(", ")}`);
}
