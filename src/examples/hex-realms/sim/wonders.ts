import { addGrowth } from "./cities";
import { networkNodes } from "./network";
import { type BuildingId, BUILDINGS, type Good, growthNeeded, MONUMENT_IDS, type MonumentId } from "./rules";
import type { Sim } from "./sim";
import type { BuildingState } from "./types";

/**
 * World wonders and monuments.
 *
 * World wonders exist once in the world: civs race to finish them, and when
 * one does, every rival site is cancelled with its delivered goods (and half
 * its stars) handed back. Monuments are personal: each civ may build each
 * one, once, after earning it with a feat; finishing one raises its city a
 * level.
 */

/** Why this civ can't place a wonder or monument now (beyond the usual site rules), or null. */
export function wonderProblem (sim: Sim, player: number, type: BuildingId): string | null {
	const info = BUILDINGS[type];
	if (info.wonder === "world") {
		const built = sim.state.buildings.find((b) => b.type === type && b.built);
		if (built) return built.owner === player ? "You built it" : `${sim.player(built.owner).name.split(" (")[0]} built it`;
		if (sim.state.buildings.some((b) => b.type === type && b.owner === player)) return "You are already building it";
	} else if (info.wonder === "monument") {
		const p = sim.player(player);
		if (!p.feats.includes(type)) return `Earn it first: ${info.feat?.toLowerCase()}`;
		if (sim.state.buildings.some((b) => b.type === type && b.owner === player)) return "You have one";
	}
	return null;
}

/** How many rival civs have a site for this world wonder. */
export function rivalSites (sim: Sim, player: number, type: BuildingId): number {
	return sim.state.buildings.filter((b) => b.type === type && !b.built && b.owner !== player).length;
}

/** A wonder or monument was finished. */
export function wonderCompleted (sim: Sim, building: BuildingState): void {
	const info = BUILDINGS[building.type];
	const lost: number[] = [];
	if (info.wonder === "world") {
		for (const site of [...sim.state.buildings]) {
			if (site.type !== building.type || site === building || site.built) continue;
			// Rivals get back what was delivered and half the stars they paid
			const city = sim.city(site.city);
			if (city) {
				for (const [g, n] of Object.entries(info.materials) as [Good, number][]) {
					const delivered = n - (site.needs[g] ?? 0);
					if (delivered > 0) city.store[g] = (city.store[g] ?? 0) + delivered;
				}
			}
			const refund = Math.floor((site.paid ?? info.stars) / 2);
			sim.player(site.owner).stars += refund;
			sim.emit({ type: "stars", player: site.owner, amount: refund, reason: `${info.name} lost` });
			lost.push(site.owner);
			sim.removeBuilding(site);
		}
	} else if (info.wonder === "monument") {
		const city = sim.city(building.city);
		if (city) addGrowth(sim, city, Math.max(0, growthNeeded(city.level) - city.growth));
	}
	sim.emit({ type: "wonder", player: building.owner, building: building.type, city: building.city, lost });
}

/** Cities linked to the capital by road. */
function linkedCities (sim: Sim, player: number): number {
	const cities = sim.citiesOf(player);
	const capital = cities.find((c) => c.capital) ?? cities[0];
	if (!capital) return 0;
	const nodes = networkNodes(sim, player);
	const seen = new Set<number>([capital.tile]);
	const queue = [capital.tile];
	for (let i = 0; i < queue.length; i++) {
		for (const n of sim.neighbors(queue[i])) {
			if (nodes[n] && !seen.has(n)) {
				seen.add(n);
				queue.push(n);
			}
		}
	}
	return cities.filter((c) => seen.has(c.tile)).length;
}

function exploredShare (sim: Sim, player: number): number {
	const explored = sim.fog.explored[player];
	let land = 0, seen = 0;
	for (let t = 0; t < sim.map.count; t++) {
		if (sim.map.isWater(t)) continue;
		land++;
		if (explored[t]) seen++;
	}
	return land ? seen / land : 0;
}

/** Has the civ done what earns this monument? */
function featDone (sim: Sim, player: number, monument: MonumentId): boolean {
	const p = sim.player(player);
	switch (monument) {
		case "victoryArch": return p.stats.kills >= 10;
		case "grandFountain": return sim.citiesOf(player).some((c) => c.level >= 6);
		case "sageTower": return p.techs.length >= 15;
		case "gildedVault": return p.stars >= 100;
		case "pathfinderCairn": return exploredShare(sim, player) >= 0.5;
		case "marketCross": return linkedCities(sim, player) >= 5;
		case "artisansColumn": return p.stats.produced >= 300;
		case "peaceGarden": {
			const known = sim.state.players.filter((q) => q.index !== player && sim.hasMet(player, q.index)).length;
			return known >= 2 && sim.state.turn >= 25 && sim.state.turn - p.lastWar >= 25;
		}
	}
}

/** Check (at the start of a civ's turn) which monuments it has newly earned. */
export function checkFeats (sim: Sim, player: number, lines: string[]): void {
	const p = sim.player(player);
	for (const m of MONUMENT_IDS) {
		if (p.feats.includes(m) || !featDone(sim, player, m)) continue;
		p.feats.push(m);
		sim.emit({ type: "feat", player, building: m });
		lines.push(`Earned a monument: ${BUILDINGS[m].name}`);
	}
}
