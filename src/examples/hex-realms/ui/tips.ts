import type { Sim } from "../sim/sim";
import { BUILDINGS, WONDER_IDS } from "../sim/rules";
import { upkeep } from "../sim/treasury";

/**
 * The advisor: short contextual tips that teach the game as it is played.
 * Each tip shows once (remembered in local storage) when its moment comes.
 */

interface Tip {
	id: string;
	text: string;
	when: (sim: Sim, player: number) => boolean;
}

const TIPS: Tip[] = [
	{
		id: "start",
		text: "Welcome! Click one of your units, then a highlighted tile to move. Grey villages can be captured: move a unit onto one and, at the start of your next turn, press <b>Capture</b>.",
		when: () => true
	},
	{
		id: "capital",
		text: "Click your capital to see its store, growth and the units it can train. Cities grow when <b>food</b> (fish, game or bread) is delivered, and each level adds a building slot and a reward.",
		when: (sim) => sim.state.turn >= 2
	},
	{
		id: "build",
		text: "Click a tile inside your borders to place buildings. Woodcutters are ready at once; anything else starts as a construction site, and carriers bring its logs, planks or stone by road from your stores. <b>Rush</b> finishes a site for stars.",
		when: (sim, p) => sim.state.turn >= 3 && sim.buildingsOf(p).length === 0
	},
	{
		id: "roads",
		text: "Goods only travel along roads. Buildings next to a city or another building are connected; others need a <b>road</b> (1 star per tile). Each road tile carries 2 loads per turn, so busy routes jam.",
		when: (sim, p) => sim.buildingsOf(p).length > 0
	},
	{
		id: "chain",
		text: "Chains turn raw goods into better ones: logs → planks at a sawmill, grain → flour → bread, ore + coal → iron → weapons or tools. Open <b>Economy</b> to see your stores and what is idle.",
		when: (sim, p) => sim.buildingsOf(p).some((b) => b.built)
	},
	{
		id: "ambition",
		text: "Choose an <b>Ambition</b> (J): Conquest, Expansion, Industry, Knowledge, Diplomacy or Wonders. Every milestone pays stars and score, double if you get there before any other civ, and completing all four earns a permanent legacy.",
		when: (sim, p) => sim.state.turn >= 2 && !sim.player(p).ambition
	},
	{
		id: "upkeep",
		text: "Your army is bigger than your free allowance (3 units plus 1 per city), so each extra unit now costs a star of <b>upkeep</b> every turn. Hover your stars in the top bar to see where they go.",
		when: (sim, p) => upkeep(sim, p) > 0
	},
	{
		id: "monument",
		text: "You've earned a <b>monument</b>! Open <b>Wonders</b> (M) to see it, then click a tile in your territory to build it. It raises its city a level.",
		when: (sim, p) => sim.player(p).feats.length > 0
	},
	{
		id: "wonder",
		text: "You can start a <b>world wonder</b>. Only one of each can exist: the first civ to finish it wins the race, and rivals' sites are cancelled. Wonders are supplied by road and can't be rushed.",
		when: (sim, p) => WONDER_IDS.some((w) => sim.hasTech(p, BUILDINGS[w].tech) && !sim.state.buildings.some((b) => b.type === w && b.built))
	},
	{
		id: "port",
		text: "With Sailing you can build a <b>Port</b> on the coast. Carriers sail between your ports, so cities across the water share one road network.",
		when: (sim, p) => sim.hasTech(p, "sailing") && sim.citiesOf(p).some((c) => sim.map.landmass[c.tile] !== sim.map.landmass[sim.citiesOf(p)[0].tile])
	},
	{
		id: "levelup",
		text: "A city levelled up! Choose its reward in the city panel.",
		when: (sim, p) => sim.citiesOf(p).some((c) => c.pendingRewards > 0)
	},
	{
		id: "research",
		text: "Spend stars on <b>Research</b> to unlock buildings and units. Costs rise with your number of cities.",
		when: (sim, p) => sim.player(p).stars >= 8
	},
	{
		id: "met",
		text: "You've met another civilisation. Open <b>Diplomacy</b> (G) to see their mood and agenda, make treaties, or trade goods and stars. Everyone starts at peace: a war without grievances behind it is a surprise war that every civ resents.",
		when: (sim, p) => sim.state.players.some((q) => q.index !== p && sim.hasMet(p, q.index))
	},
	{
		id: "war",
		text: "You are at war. Select a unit to see red attack rings; hover one to preview the damage both ways before attacking. Hills, forests and walls help defenders.",
		when: (sim, p) => sim.state.players.some((q) => q.alive && q.index !== p && sim.atWar(p, q.index))
	}
];

let disabled = read("hexRealms.tipsOff") === "1";
const seen = new Set((read("hexRealms.tipsSeen") ?? "").split(",").filter(Boolean));

function read (key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write (key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Storage unavailable: tips reset next session
	}
}

export function tipsEnabled (): boolean {
	return !disabled;
}

export function setTipsEnabled (on: boolean): void {
	disabled = !on;
	write("hexRealms.tipsOff", on ? "0" : "1");
}

/** The next tip to show now, if any. */
export function nextTip (sim: Sim, player: number): { id: string; text: string } | null {
	if (disabled) return null;
	for (const tip of TIPS) {
		if (!seen.has(tip.id) && tip.when(sim, player)) return tip;
	}
	return null;
}

export function markTipSeen (id: string): void {
	seen.add(id);
	write("hexRealms.tipsSeen", [...seen].join(","));
}

export function resetTips (): void {
	seen.clear();
	write("hexRealms.tipsSeen", "");
	setTipsEnabled(true);
}
