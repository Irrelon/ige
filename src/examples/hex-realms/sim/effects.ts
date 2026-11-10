import { type BuildingId, BUILDINGS, type TechId, techCost, type WonderId } from "./rules";
import type { Sim } from "./sim";

/**
 * What world wonders and ambition legacies change. The rule modules ask
 * here rather than checking wonders themselves, so every effect is in one
 * place.
 */

/** Does this civ own a finished world wonder (or monument)? */
export function hasWonder (sim: Sim, player: number, type: BuildingId): boolean {
	return player >= 0 && sim.state.buildings.some((b) => b.type === type && b.owner === player && b.built);
}

/** The civ that holds a world wonder, or -1. */
export function wonderHolder (sim: Sim, type: WonderId): number {
	return sim.state.buildings.find((b) => b.type === type && b.built)?.owner ?? -1;
}

/** Finished world wonders and monuments a civ owns. */
export function wondersOf (sim: Sim, player: number): { world: number; monuments: number } {
	let world = 0, monuments = 0;
	for (const b of sim.state.buildings) {
		if (b.owner !== player || !b.built) continue;
		const kind = BUILDINGS[b.type].wonder;
		if (kind === "world") world++;
		else if (kind === "monument") monuments++;
	}
	return { world, monuments };
}

/** Holds the legacy perk of an ambition. */
export function hasLegacy (sim: Sim, player: number, ambition: string): boolean {
	const p = sim.player(player);
	return !!p && p.legacy && p.ambition === ambition;
}

/** Research cost for a civ: tier and city count, less the Great Library, the Enlightened legacy. */
export function researchCost (sim: Sim, player: number, tech: TechId): number {
	let cost = techCost(tech, sim.citiesOf(player).length);
	if (hasWonder(sim, player, "greatLibrary")) cost *= 0.75;
	if (hasLegacy(sim, player, "knowledge")) cost *= 0.5;
	return Math.max(1, Math.ceil(cost));
}

/** Damage multiplier for attacks by a civ's units (Warlords legacy). */
export function damageFactor (sim: Sim, player: number): number {
	return hasLegacy(sim, player, "conquest") ? 1.2 : 1;
}

/** Defence multiplier inside one's own city. */
export function cityDefence (sim: Sim, player: number, walls: boolean): number {
	if (walls) return 4;
	return hasWonder(sim, player, "greatWall") ? 2.5 : 1.5;
}

/** Extra sight for a civ's units and cities (Great Observatory). */
export function sightBonus (sim: Sim, player: number): number {
	return hasWonder(sim, player, "observatory") ? 1 : 0;
}


/** Market sale multiplier (Grand Bazaar). */
export function marketFactor (sim: Sim, player: number): number {
	return hasWonder(sim, player, "grandBazaar") ? 1.5 : 1;
}

/** Extra World Council votes (Council Hall, Peacemakers legacy). */
export function voteBonus (sim: Sim, player: number): number {
	return (hasWonder(sim, player, "councilHall") ? 3 : 0) + (hasLegacy(sim, player, "diplomacy") ? 3 : 0);
}

/** Units trained by this civ start as veterans (Hall of Heroes). */
export function trainsVeterans (sim: Sim, player: number): boolean {
	return hasWonder(sim, player, "hallOfHeroes");
}
