import { attitude } from "./diplomacy";
import { wondersOf } from "./effects";
import { fail, ok } from "./result";
import {
	type AmbitionId, AMBITIONS, FIRST_LEGACY_SCORE, LEGACY_SCORE, type Measure, MILESTONE_SCORE, milestoneStars
} from "./rules";
import type { Sim } from "./sim";
import { ALLIANCE, type CommandResult } from "./types";

/**
 * Ambitions: Civilization VII-style goals. A civ picks one ambition and
 * races through its four milestones; each pays stars and score, double for
 * the first civ in the world to reach it. Completing all four earns the
 * ambition's permanent legacy perk. Ambitions give bonuses only; the victory
 * types are unchanged.
 */

/** A civ's current value for what a milestone counts. */
export function measure (sim: Sim, player: number, m: Measure): number {
	const p = sim.player(player);
	const d = sim.state.diplomacy;
	const n = sim.playerCount;
	const others = sim.state.players.filter((q) => q.index !== player && q.alive);
	switch (m) {
		case "kills": return p.stats.kills;
		case "conquered": return p.stats.conquered;
		case "cities": return sim.citiesOf(player).length;
		case "produced": return p.stats.produced;
		case "techs": return p.techs.length;
		case "met": return others.filter((q) => sim.hasMet(player, q.index)).length;
		case "treaties": return others.reduce((s, q) => s + d.openBorders[player * n + q.index] + d.trade[player * n + q.index] + d.pact[player * n + q.index], 0);
		case "alliances": return others.filter((q) => sim.relation(player, q.index) === ALLIANCE).length;
		case "friends": return others.filter((q) => attitude(sim, q.index, player) >= 5).length;
		case "monuments": return wondersOf(sim, player).monuments;
		case "worldWonders": return wondersOf(sim, player).world;
		case "wondersTotal": {
			const w = wondersOf(sim, player);
			return w.world + w.monuments;
		}
	}
}

/** A milestone's target for this game (counts of other civs are capped by how many there are). */
export function target (sim: Sim, m: Measure, value: number): number {
	return m === "met" || m === "friends" ? Math.min(value, sim.playerCount - 1) : value;
}

/** Why this civ can't take up an ambition now, or null. */
export function ambitionProblem (sim: Sim, player: number, ambition: AmbitionId): string | null {
	const p = sim.player(player);
	if (!AMBITIONS[ambition]) return "Unknown ambition";
	if (p.ambition === ambition) return "That is already your ambition";
	if (p.ambition && p.milestones.length > 0) return `You are committed to ${AMBITIONS[p.ambition].name}`;
	return null;
}

export function ambitionCommand (sim: Sim, player: number, ambition: AmbitionId): CommandResult {
	const problem = ambitionProblem(sim, player, ambition);
	if (problem) return fail(problem);
	const p = sim.player(player);
	p.ambition = ambition;
	p.milestones = [];
	// Milestones already met pay out, but without the first-civ bonus
	checkAmbition(sim, player, false);
	return ok();
}

/** Award any milestones the civ has newly reached. */
export function checkAmbition (sim: Sim, player: number, canBeFirst = true): void {
	const p = sim.player(player);
	if (!p.ambition || !p.alive || p.legacy) return;
	const ambition = AMBITIONS[p.ambition];
	ambition.milestones.forEach((m, index) => {
		if (p.milestones.includes(index)) return;
		if (measure(sim, player, m.measure) < target(sim, m.measure, m.target)) return;
		const key = `${ambition.id}:${index}`;
		const first = canBeFirst && sim.state.firsts[key] === undefined;
		if (first) sim.state.firsts[key] = player;
		p.milestones.push(index);
		const stars = milestoneStars(index) * (first ? 2 : 1);
		p.stars += stars;
		sim.emit({ type: "stars", player, amount: stars, reason: m.text });
		sim.emit({ type: "milestone", player, ambition: ambition.id, index, first, legacy: false });
	});
	if (p.milestones.length === ambition.milestones.length) {
		p.legacy = true;
		const key = `${ambition.id}:legacy`;
		const first = sim.state.firsts[key] === undefined;
		if (first) sim.state.firsts[key] = player;
		sim.emit({ type: "milestone", player, ambition: ambition.id, index: ambition.milestones.length, first, legacy: true });
	}
}

/** Score from ambitions: milestones (double when first) and the legacy. */
export function ambitionScore (sim: Sim, player: number): number {
	const p = sim.player(player);
	if (!p.ambition) return 0;
	let score = 0;
	for (const index of p.milestones) score += MILESTONE_SCORE * (sim.state.firsts[`${p.ambition}:${index}`] === player ? 2 : 1);
	if (p.legacy) score += LEGACY_SCORE + (sim.state.firsts[`${p.ambition}:legacy`] === player ? FIRST_LEGACY_SCORE : 0);
	return score;
}
