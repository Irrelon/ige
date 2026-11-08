import { ambitionProblem, measure, target } from "../sim/ambitions";
import { buildingStars } from "../sim/economy";
import { rivalSites } from "../sim/wonders";
import {
	AMBITION_IDS, AMBITIONS, BUILDINGS, FIRST_LEGACY_SCORE, LEGACY_SCORE, MILESTONE_SCORE, milestoneStars, MONUMENT_IDS, TECHS, WONDER_IDS
} from "../sim/rules";
import type { Sim } from "../sim/sim";
import { esc, goodsInline, swatch } from "./html";

/** The Wonders screen (world wonders and monuments) and the Ambition screen (goals and the race board). */

function civName (sim: Sim, p: number): string {
	return esc(sim.player(p).name.split(" (")[0]);
}

export function wondersModal (sim: Sim, me: number): string {
	const p = sim.player(me);
	const where = (tile: number, label: string) => `<a href="#" data-action="select-tile" data-tile="${tile}">${label}</a>`;
	const world = WONDER_IDS.filter((w) => w !== "grandExchange" || sim.options.victories.prosperity).map((w) => {
		const info = BUILDINGS[w];
		const built = sim.state.buildings.find((b) => b.type === w && b.built);
		const mine = sim.state.buildings.find((b) => b.type === w && b.owner === me && !b.built);
		const rivals = rivalSites(sim, me, w);
		let status: string;
		if (built) {
			status = built.owner === me ? `<b class="good">Yours</b> (${where(built.tile, esc(sim.city(built.city)?.name ?? "here"))})` : `Built by ${swatch(sim.player(built.owner).color)}${civName(sim, built.owner)}`;
		} else if (mine) {
			status = `<b>Building</b> (${where(mine.tile, "show")}): needs ${goodsInline(mine.needs)}${rivals ? ` &middot; <span class="warn">${rivals} rival${rivals > 1 ? "s" : ""} racing</span>` : ""}`;
		} else if (!sim.hasTech(me, info.tech)) {
			status = `<span class="dim">Research ${TECHS[info.tech!].name}</span>${rivals ? ` &middot; ${rivals} civ${rivals > 1 ? "s" : ""} building it` : ""}`;
		} else {
			status = `<span class="good">Available</span>: click a tile in your territory${rivals ? ` &middot; <span class="warn">${rivals} rival${rivals > 1 ? "s" : ""} racing</span>` : ""}`;
		}
		return `<tr class="${built ? "dim-row" : ""}"><td><b>${info.name}</b><br><small class="dim">${TECHS[info.tech!].name}</small></td><td class="small">${esc(info.description)}</td><td class="small">&#9733;${buildingStars(sim, me, w)} + ${goodsInline(info.materials)}</td><td class="small">${status}</td></tr>`;
	}).join("");

	const monuments = MONUMENT_IDS.map((m) => {
		const info = BUILDINGS[m];
		const own = sim.state.buildings.find((b) => b.type === m && b.owner === me);
		const earned = p.feats.includes(m);
		const status = own
			? own.built ? `<b class="good">Built</b> (${where(own.tile, esc(sim.city(own.city)?.name ?? "here"))})` : `<b>Building</b> (${where(own.tile, "show")}): needs ${goodsInline(own.needs)}`
			: earned ? `<span class="good">Earned</span>: click a tile in your territory` : `<span class="dim">Not earned yet</span>`;
		return `<tr><td><b>${info.name}</b></td><td class="small">${esc(info.feat ?? "")}</td><td class="small">&#9733;${buildingStars(sim, me, m)} + ${goodsInline(info.materials)}</td><td class="small">${status}</td></tr>`;
	}).join("");

	return `<h3>Wonders and monuments</h3>
		<p class="dim small">A world wonder exists once: the first civ to finish it keeps it, and rival sites are cancelled (their goods and half their stars come back). Wonders are supplied by road and can't be rushed. Monuments are yours alone: earn each with a feat, then build it; it raises its city a level. Both add score.</p>
		<h4>World wonders</h4><table class="wonder-table">${world}</table>
		<h4>Monuments</h4><table class="wonder-table">${monuments}</table>`;
}

export function ambitionsModal (sim: Sim, me: number): string {
	const p = sim.player(me);
	const cards = AMBITION_IDS.map((id) => {
		const a = AMBITIONS[id];
		const current = p.ambition === id;
		const items = a.milestones.map((m, i) => {
			const reached = current && p.milestones.includes(i);
			const first = sim.state.firsts[`${id}:${i}`];
			const value = measure(sim, me, m.measure), goal = target(sim, m.measure, m.target);
			const progress = current && !reached ? ` <span class="dim">(${Math.min(value, goal)}/${goal})</span>` : "";
			const firstBy = first !== undefined ? ` <span class="small ${first === me ? "good" : "dim"}">&#9733; first: ${first === me ? "you" : civName(sim, first)}</span>` : "";
			return `<li class="${reached ? "good" : ""}">${reached ? "&#10003; " : ""}${esc(m.text)} <span class="dim small">&#9733;${milestoneStars(i)}</span>${progress}${firstBy}</li>`;
		}).join("");
		const problem = ambitionProblem(sim, me, id);
		const button = current ? `<span class="good small">Your ambition${p.legacy ? ": legacy earned" : ""}</span>` : `<button data-action="ambition" data-ambition="${id}" ${problem ? `disabled title="${esc(problem)}"` : ""}>Choose</button>`;
		return `<div class="ambition ${current ? "on" : ""}"><b>${a.name}</b> <span class="dim small">${esc(a.description)}</span><ol>${items}</ol><div class="small">Legacy: <b>${a.legacy.name}</b>: ${esc(a.legacy.description)}</div>${button}</div>`;
	}).join("");

	const board = sim.state.players.filter((q) => q.alive).map((q) => {
		const known = q.index === me || sim.hasMet(me, q.index);
		if (!known) return `<tr><td>${swatch(q.color)}<span class="dim">Unknown civilisation</span></td><td colspan="2" class="dim">Not met yet</td></tr>`;
		const a = q.ambition ? AMBITIONS[q.ambition] : null;
		const dots = a ? a.milestones.map((_, i) => (q.milestones.includes(i) ? (sim.state.firsts[`${a.id}:${i}`] === q.index ? "&#9733;" : "&#9679;") : "&#9675;")).join(" ") : "";
		return `<tr><td>${swatch(q.color)}${esc(q.name)}${q.index === me ? " (you)" : ""}</td><td>${a ? a.name : `<span class="dim">Undecided</span>`}</td><td>${dots}${q.legacy ? ` <b class="good">${a?.legacy.name}</b>` : ""}</td></tr>`;
	}).join("");

	const intro = p.ambition
		? p.milestones.length ? `You are racing for <b>${AMBITIONS[p.ambition].name}</b>.` : `You chose <b>${AMBITIONS[p.ambition].name}</b>; you can still change your mind until you reach its first milestone.`
		: "Choose the ambition you will race for.";
	return `<h3>Ambition</h3>
		<p class="small">${intro} Each milestone pays stars and ${MILESTONE_SCORE} score, <b>double</b> for the first civ in the world to reach it. Completing all four earns a permanent legacy (+${LEGACY_SCORE} score, +${FIRST_LEGACY_SCORE} more if you're first). Milestones already met when you choose pay out without the first-civ bonus.</p>
		<div class="ambition-grid">${cards}</div>
		<h4>Race board <span class="dim small">(&#9733; first to a milestone, &#9679; reached)</span></h4><table>${board}</table>`;
}
