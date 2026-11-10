import { strength } from "./diplomacy";
import type { Sim } from "./sim";
import { income } from "./treasury";
import { score } from "./victory";

/**
 * Each civ's standing, recorded once per round (and at the start), for the
 * Rankings charts and the end-of-game screen. Kept in the game state, so it
 * is saved with the game and the same in every copy of an online game.
 */

export const HISTORY_METRICS = ["score", "cities", "land", "military", "techs", "stars", "income", "produced"] as const;
export type HistoryMetric = typeof HISTORY_METRICS[number];

export type HistoryPoint = { turn: number } & Record<HistoryMetric, number[]>;

export const METRIC_INFO: Record<HistoryMetric, { name: string; description: string }> = {
	score: { name: "Score", description: "Score victory points: cities, land, techs, wonders and more" },
	cities: { name: "Cities", description: "Cities held" },
	land: { name: "Land", description: "Tiles inside its borders" },
	military: { name: "Military", description: "Army strength: attack and defence of every unit, by health" },
	techs: { name: "Techs", description: "Technologies researched" },
	stars: { name: "Treasury", description: "Stars in the treasury" },
	income: { name: "Income", description: "Stars a turn after upkeep" },
	produced: { name: "Goods", description: "Goods produced so far" }
};

/** Add this round's standings for every civ. */
export function recordHistory (sim: Sim): void {
	const n = sim.playerCount;
	const point = { turn: sim.state.turn } as HistoryPoint;
	for (const m of HISTORY_METRICS) point[m] = new Array(n).fill(0);
	const land = new Array(n).fill(0);
	for (let t = 0; t < sim.map.count; t++) {
		const o = sim.map.owner[t];
		if (o >= 0) land[o]++;
	}
	for (const p of sim.state.players) {
		if (!p.alive) continue;
		const i = p.index;
		point.score[i] = score(sim, i);
		point.cities[i] = sim.citiesOf(i).length;
		point.land[i] = land[i];
		point.military[i] = Math.round(strength(sim, i));
		point.techs[i] = p.techs.length;
		point.stars[i] = Math.floor(p.stars);
		point.income[i] = income(sim, i).net;
		point.produced[i] = p.stats.produced;
	}
	// One point per turn (a repeat replaces the last)
	const h = sim.state.history;
	if (h.length && h[h.length - 1].turn === point.turn) h[h.length - 1] = point;
	else h.push(point);
}
