import { BUILDING_IDS, type BuildingId, BUILDINGS, Deposit, DEPOSIT_GOOD, DEPOSIT_NAMES, FOOD_VALUE, type Good, GOOD_INFO, HARVEST, TECHS, UNIT_TYPE_IDS, UNIT_TYPES } from "../sim/rules";
import type { Sim } from "../sim/sim";
import { FEATURE_NAMES, Relief, RELIEF_NAMES, Terrain, TERRAIN_INFO } from "../terrain";
import { esc, goodChip } from "./html";

/**
 * The glossary behind the tile panel's words: click "Coal", "Hills" or
 * "Forest" and a card says what it is for once it is joined to a city:
 * what can be built there, what that makes, what uses it, and how it
 * affects units. Written from the rules data, so it stays true as they
 * change.
 */

export type TermKey = `good:${Good}` | `terrain:${Terrain}` | `relief:${Relief}` | "forest" | "river" | "camp";

/** A word in the tile panel that opens its glossary card. */
export function termLink (key: TermKey, label: string, bold = false): string {
	const text = bold ? `<b>${esc(label)}</b>` : esc(label);
	return `<a href="#" class="term" data-action="term" data-term="${key}" title="What is ${esc(label)}?">${text}</a>`;
}

const goodLink = (g: Good) => `<a href="#" class="term-chip" data-action="term" data-term="good:${g}">${goodChip(g)}</a>`;
const buildingName = (b: BuildingId) => `<b>${esc(BUILDINGS[b].name)}</b>${BUILDINGS[b].tech ? ` <span class="dim">(${esc(TECHS[BUILDINGS[b].tech!].name)})</span>` : ""}`;
const list = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "");

/** Buildings that make a good (mines dig their deposit). */
function makersOf (good: Good): string[] {
	const out: string[] = [];
	for (const b of BUILDING_IDS) {
		const info = BUILDINGS[b];
		if (info.wonder) continue;
		if (good in info.outputs) {
			const inputs = Object.keys(info.inputs) as Good[];
			out.push(`${buildingName(b)}${inputs.length ? ` from ${inputs.map(goodLink).join(" + ")}` : ""}`);
		}
	}
	const deposit = (Object.keys(DEPOSIT_GOOD) as unknown as Deposit[]).find((d) => DEPOSIT_GOOD[d] === good);
	if (deposit !== undefined && [Deposit.Ore, Deposit.Coal, Deposit.Gold].includes(Number(deposit))) out.push(`${buildingName("mine")} on hills with ${esc(DEPOSIT_NAMES[deposit].toLowerCase())}`);
	return out;
}

/** Buildings, units and wonders that use a good. */
function usersOf (good: Good): string[] {
	const out: string[] = [];
	for (const b of BUILDING_IDS) {
		const info = BUILDINGS[b];
		if (good in info.inputs) {
			const outputs = Object.keys(info.outputs) as Good[];
			out.push(`${buildingName(b)} turns it into ${outputs.map(goodLink).join(", ")}${Object.keys(info.inputs).length > 1 ? ` (with ${(Object.keys(info.inputs) as Good[]).filter((g) => g !== good).map(goodLink).join(" + ")})` : ""}`);
		}
	}
	const builds = BUILDING_IDS.filter((b) => (BUILDINGS[b].materials as Record<string, number>)[good]).map((b) => esc(BUILDINGS[b].name));
	if (builds.length) out.push(`Building material for ${builds.slice(0, 6).join(", ")}${builds.length > 6 ? ` and ${builds.length - 6} more` : ""}`);
	const units = UNIT_TYPE_IDS.filter((u) => (UNIT_TYPES[u].goods as Record<string, number> | undefined)?.[good]).map((u) => esc(UNIT_TYPES[u].name));
	if (units.length) out.push(`Needed to train ${units.join(", ")}`);
	return out;
}

function goodCard (sim: Sim, good: Good): { title: string; html: string } {
	const info = GOOD_INFO[good];
	const food = FOOD_VALUE[good] ?? 0;
	const paras: string[] = [];
	paras.push(`A tier-${info.tier} good, worth ${info.price} star${info.price === 1 ? "" : "s"} at a market. Goods travel along your roads: anything joined to a city by road reaches its store the same turn.`);
	if (food > 0) paras.push(`<b>Food</b>: delivered to a city it adds ${food} growth${good === "fish" ? " (Coastfolk get a quarter more)" : ""}.`);
	if (good === "grain") paras.push(`Only Plainsfolk eat grain as it is (a quarter growth each); everyone else mills it into flour and bakes bread.`);
	const harvest = (Object.keys(HARVEST) as unknown as Deposit[]).find((d) => DEPOSIT_GOOD[d] === good);
	if (harvest !== undefined && sim.options.buildGrowth) {
		const rule = HARVEST[harvest]!;
		paras.push(`<b>Harvest</b>: in your land, ${esc(rule.name.toLowerCase())} it for ${rule.stars} stars to grow its city by ${rule.pop} at once (with ${esc(TECHS[rule.tech].name)}). That uses it up.`);
	}
	const made = makersOf(good), used = usersOf(good);
	return {
		title: info.name,
		html: `<p>${paras.join("</p><p>")}</p>${made.length ? `<h4>Made by</h4>${list(made)}` : ""}${used.length ? `<h4>Used by</h4>${list(used)}` : ""}`
	};
}

/** Buildings whose site a tile of this kind can hold. */
function sitesOn (kind: "farmland" | "forest" | "hills" | "mountain" | "coast"): string[] {
	switch (kind) {
		case "farmland": return [`${buildingName("farm")}: grain`, `${buildingName("pasture")} where horses roam`];
		case "forest": return [`${buildingName("woodcutter")}: logs, ready at once`, `${buildingName("hunter")} where there is game`];
		case "hills": return [`${buildingName("quarry")}: stone`, `${buildingName("mine")} on ore, coal or gold`];
		case "mountain": return [`${buildingName("quarry")} on hills or land beside a mountain`];
		case "coast": return [`${buildingName("fishery")} beside fish`, `${buildingName("port")}: joins your coasts by sea`];
	}
}

export function termCard (sim: Sim, key: TermKey): { title: string; html: string } {
	if (key.startsWith("good:")) return goodCard(sim, key.slice(5) as Good);
	if (key === "forest") {
		return {
			title: "Forest",
			html: `<p>Woods (forest, pine or jungle). Slow going: a unit stepping in ends its move, but defends +50% there, and the trees block line of sight.</p><h4>Build</h4>${list(sitesOn("forest"))}<p class="dim">Building anything else clears the trees.</p>`
		};
	}
	if (key === "river") {
		return {
			title: "River",
			html: `<p>Rivers run along tile edges. Crossing one costs an extra move unless a road bridges it, and a defender across a river gets +25%.</p><p>Farms beside a river grow an extra grain; River Folk earn a star a turn for each riverside city and move along rivers freely.</p>`
		};
	}
	if (key === "camp") {
		return {
			title: "Raider camp",
			html: `<p>An outlaw camp. Its raiders attack units and burn buildings and roads around it, but never take cities. Walk a unit into the camp to scatter it for a bounty of stars.</p>`
		};
	}
	if (key.startsWith("relief:")) {
		const relief = Number(key.slice(7)) as Relief;
		if (relief === Relief.Hills) {
			return {
				title: "Hills",
				html: `<p>Rough ground: a unit stepping in ends its move, but defends +50% there and sees further from the top.</p><h4>Build</h4>${list(sitesOn("hills"))}<p>Cities can be founded on hills.</p>`
			};
		}
		return {
			title: "Mountains",
			html: `<p>Impassable, and they block line of sight. Nothing can be built on them, but a quarry beside a mountain cuts its stone.</p>`
		};
	}
	const terrain = Number(key.slice(8)) as Terrain;
	const info = TERRAIN_INFO[terrain];
	const notes: Record<Terrain, string> = {
		[Terrain.DeepOcean]: "Open sea. Units can cross it once embarked, with Navigation.",
		[Terrain.Ocean]: "Shallow coastal water. Units embark onto it with Sailing; fish here feed fisheries on the shore.",
		[Terrain.Ice]: "Frozen sea: nothing can cross it.",
		[Terrain.Grassland]: "Fertile open land, the best for farms.",
		[Terrain.Plains]: "Open land, good for farms.",
		[Terrain.Desert]: "Dry land: nothing grows, but a city can still stand here, and hills and deposits can still be worked.",
		[Terrain.Tundra]: "Cold, thin land: little grows.",
		[Terrain.Snow]: "Frozen land: little to use."
	};
	const farmland = terrain === Terrain.Grassland || terrain === Terrain.Plains;
	const build = farmland ? sitesOn("farmland") : info.water ? sitesOn("coast") : [];
	return {
		title: info.name,
		html: `<p>${notes[terrain]}</p>${build.length ? `<h4>${info.water ? "On the shore" : "Build"}</h4>${list(build)}` : ""}${info.settleable ? `<p class="dim">Cities can be founded here (flat land or hills).</p>` : ""}`
	};
}
