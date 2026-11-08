import { ambitionScore } from "./ambitions";
import { BUILDINGS, MONUMENT_SCORE, WONDER_SCORE } from "./rules";
import type { Sim } from "./sim";
import { ALLIANCE, type VictoryType } from "./types";

/**
 * Victory conditions (each can be switched off in game setup):
 * - Domination: the last civ with cities standing (always ends the game).
 * - Alliance: every surviving civ is allied with every other.
 * - Prosperity: a civ completes the Grand Exchange.
 * - Diplomatic: a civ wins the World Council election twice in a row.
 * - Score: when the turn limit passes, the highest score wins.
 */

export function score (sim: Sim, player: number): number {
	const p = sim.player(player);
	const cities = sim.citiesOf(player);
	let territory = 0;
	for (let t = 0; t < sim.map.count; t++) if (sim.map.owner[t] === player) territory++;
	let wonders = 0;
	for (const b of sim.state.buildings) {
		if (b.owner !== player || !b.built) continue;
		const kind = BUILDINGS[b.type].wonder;
		if (kind === "world") wonders += b.type === "grandExchange" ? 100 : WONDER_SCORE;
		else if (kind === "monument") wonders += MONUMENT_SCORE;
	}
	return Math.round(
		cities.length * 20 +
		cities.reduce((s, c) => s + c.level, 0) * 10 +
		territory * 2 +
		p.techs.length * 8 +
		p.stats.produced * 0.5 +
		p.stats.kills * 5 +
		wonders +
		ambitionScore(sim, player)
	);
}

function win (sim: Sim, type: VictoryType, players: number[]): void {
	if (sim.state.winner) return;
	sim.state.winner = { type, players };
	sim.emit({ type: "gameOver", winner: sim.state.winner });
}

/** Checked after every command. */
export function checkVictory (sim: Sim): void {
	if (sim.state.winner) return;
	const v = sim.options.victories;

	if (v.prosperity) {
		const wonder = sim.state.buildings.find((b) => b.type === "grandExchange" && b.built);
		if (wonder) return win(sim, "prosperity", [wonder.owner]);
	}

	const alive = sim.state.players.filter((p) => p.alive).map((p) => p.index);
	if (alive.length === 1) return win(sim, "domination", alive);

	if (v.alliance && alive.length >= 2) {
		const allAllied = alive.every((a) => alive.every((b) => a === b || sim.relation(a, b) === ALLIANCE));
		if (allAllied) return win(sim, "alliance", alive);
	}

	const council = sim.state.diplomacy.council;
	if (v.diplomatic && council.formed && council.streak >= 2 && council.lastWinner >= 0) {
		return win(sim, "diplomatic", [council.lastWinner]);
	}
}

/** Checked at the end of every round. */
export function roundCheck (sim: Sim): void {
	checkVictory(sim);
	if (sim.state.winner) return;
	if (sim.options.victories.score && sim.state.turn > sim.options.turnLimit) {
		const alive = sim.state.players.filter((p) => p.alive).map((p) => p.index);
		const scores = alive.map((p) => score(sim, p));
		const best = Math.max(...scores);
		win(sim, "score", alive.filter((_, i) => scores[i] === best));
	}
}
