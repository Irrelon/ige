import { Feature, Relief, Terrain } from "../terrain";
import { riverside } from "../rivers";
import { foundProblem } from "./cities";
import { CIVS, Deposit } from "./rules";
import type { Sim } from "./sim";

/**
 * How good a tile would be for a new city (the settler's advisor). A new
 * city claims the free land around it (radius 1; the ring beyond counts for
 * a little, for later border growth), so the rating adds up what that land
 * could hold: food (game in the woods, fish, farmland, horses), industry
 * (forests, mines on ore, coal or gold, quarries), the coast and rivers.
 * Then it takes off for land already claimed, rivals close by, raider camps
 * and being far from your other cities. For advice only: the game never
 * uses it.
 */

export type SiteGrade = "Excellent" | "Good" | "Fair" | "Poor";

export interface SiteReport {
	tile: number;
	/** Why a city can't be founded here, or null. */
	problem: string | null;
	score: number;
	grade: SiteGrade;
	/** The best things about it, most important first. */
	pros: string[];
	cons: string[];
}

function grade (score: number): SiteGrade {
	return score >= 11 ? "Excellent" : score >= 7 ? "Good" : score >= 3 ? "Fair" : "Poor";
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function rateSite (sim: Sim, player: number, tile: number): SiteReport {
	const map = sim.map;
	const problem = foundProblem(sim, player, tile);
	const pros: [number, string][] = [];
	const cons: [number, string][] = [];
	let score = 0;

	// What the land within reach could hold (the near ring in full, the far ring at 40%)
	const near = sim.tilesWithin(tile, 1);
	const far = sim.tilesWithin(tile, 2).filter((t) => !near.includes(t));
	const free = (t: number) => map.owner[t] < 0 || (map.owner[t] === player && sim.tileCity[t] < 0);
	const tally = { game: 0, fish: 0, farmland: 0, horses: 0, forest: 0, ore: 0, coal: 0, gold: 0, quarry: 0, barren: 0 };
	let taken = 0;
	// Only what the player has explored counts (the advice mustn't see through the fog)
	let unknown = 0;
	// Forests right around the city (what the advice counts out loud)
	let nearForests = 0;
	const weigh = (t: number, w: number) => {
		if (!sim.knows(player, t)) {
			if (w === 1) unknown++;
			return;
		}
		if (!free(t)) {
			if (w === 1 && t !== tile) taken++;
			return;
		}
		const relief = map.relief[t] as Relief;
		const terrain = map.terrain[t] as Terrain;
		const wooded = map.feature[t] !== Feature.None && relief !== Relief.Mountain;
		const deposit = map.deposit[t] as Deposit;
		let useful = false;
		if (map.isWater(t)) {
			if (deposit === Deposit.Fish) {
				tally.fish += w;
				useful = true;
			}
		} else {
			if (wooded) {
				tally.forest += w;
				if (w === 1) nearForests++;
				useful = true;
				if (deposit === Deposit.Game) tally.game += w;
			}
			if (relief === Relief.Flat && !wooded && (terrain === Terrain.Grassland || terrain === Terrain.Plains)) {
				tally.farmland += w;
				useful = true;
			}
			if (deposit === Deposit.Horses) {
				tally.horses += w;
				useful = true;
			}
			if (relief === Relief.Hills) {
				tally.quarry += w;
				useful = true;
				if (deposit === Deposit.Ore) tally.ore += w;
				if (deposit === Deposit.Coal) tally.coal += w;
				if (deposit === Deposit.Gold) tally.gold += w;
			}
		}
		if (!useful && t !== tile) tally.barren += w;
	};
	for (const t of near) weigh(t, 1);
	for (const t of far) weigh(t, 0.4);

	// Food grows the city: game and fish feed it (and can be harvested), farms make grain for bread
	const food = tally.game * 2 + tally.fish * 2 + Math.min(3, tally.farmland) * 0.8 + tally.horses * 0.6;
	score += food;
	const foodBits = [tally.game >= 1 && "game", tally.fish >= 1 && "fish", tally.farmland >= 2 && "farmland", tally.horses >= 1 && "horses"].filter(Boolean) as string[];
	if (food >= 3) pros.push([food, `Plenty of food (${foodBits.join(", ")})`]);
	else if (foodBits.length) pros.push([food, `Some food (${foodBits.join(", ")})`]);
	else cons.push([3, "No food nearby: it will grow slowly"]);

	// Industry: logs first, then stone, then ore and coal (iron) or gold (coins)
	const forests = Math.min(4, tally.forest);
	score += forests * 0.7;
	if (tally.forest >= 2) pros.push([forests, nearForests ? `${plural(nearForests, "forest")} beside it for logs` : "Forests nearby for logs"]);
	else if (tally.forest < 0.5) cons.push([2, "No forest for logs"]);
	const ores = (tally.ore >= 0.4 ? 1 : 0) + (tally.coal >= 0.4 ? 1 : 0);
	score += Math.min(2, tally.ore) * 1.5 + Math.min(2, tally.coal) * 1.5 + Math.min(2, tally.gold) * 2 + Math.min(1.5, tally.quarry) * 0.8;
	if (ores === 2) pros.push([4, "Ore and coal: iron for tools and weapons"]);
	else if (tally.ore >= 0.4 || tally.coal >= 0.4) pros.push([2, tally.ore >= 0.4 ? "Ore in the hills" : "Coal in the hills"]);
	if (tally.gold >= 0.4) pros.push([3, "Gold in the hills"]);
	if (tally.quarry >= 1 && !ores) pros.push([1, "Hills for a quarry"]);

	// The coast (ports, fisheries) and rivers (riverside farms, River Folk)
	const coastal = sim.neighbors(tile).some((n) => sim.knows(player, n) && map.isWater(n) && map.terrain[n] !== Terrain.Ice);
	if (coastal) {
		score += 1;
		pros.push([1.5, "On the coast: ports join it to your other coasts"]);
	}
	if (sim.options.rivers && riverside(map, tile)) {
		const riverFolk = sim.player(player).civ === "riverfolk";
		score += riverFolk ? 2.5 : 1;
		pros.push([riverFolk ? 3 : 1.2, riverFolk ? `On a river: +1 star a turn (${CIVS.riverfolk.name})` : "On a river: richer farms"]);
	}

	// Land already claimed, and land with nothing on it
	if (taken >= 3) {
		score -= taken * 0.6;
		cons.push([taken, `${plural(taken, "neighbouring tile")} already claimed`]);
	}
	if (tally.barren >= 3.5) {
		score -= 1.5;
		cons.push([2, "Much of the land is barren"]);
	}

	if (unknown >= 2) cons.push([1, `${plural(unknown, "neighbouring tile")} not explored yet`]);

	// Neighbours: your own cities (spread out, but not too far), rivals, raiders
	const mine = sim.citiesOf(player);
	const nearestMine = mine.length ? Math.min(...mine.map((c) => sim.distance(c.tile, tile))) : Infinity;
	if (mine.length && nearestMine >= 10) {
		score -= 1.5;
		cons.push([2, "Far from your other cities: hard to link by road and defend"]);
	}
	const capital = mine.find((c) => c.capital);
	if (capital && map.landmass[capital.tile] !== map.landmass[tile] && !map.isWater(tile)) {
		score -= sim.hasTech(player, "sailing") ? 0.5 : 1.5;
		cons.push([1.5, "Across the water from your capital: needs ports to share goods"]);
	}
	const rival = sim.state.cities.filter((c) => c.owner >= 0 && c.owner !== player && sim.distance(c.tile, tile) <= 4 && sim.knows(player, c.tile))
		.sort((a, b) => sim.distance(a.tile, tile) - sim.distance(b.tile, tile))[0];
	if (rival) {
		score -= 2;
		cons.push([3, `Close to ${sim.player(rival.owner).name.split(" (")[0]}'s ${rival.name}: borders will clash`]);
	}
	if (sim.state.camps.some((c) => sim.distance(c.tile, tile) <= 4 && sim.knows(player, c.tile))) {
		score -= 1;
		cons.push([2, "A raider camp is close by"]);
	}
	if (sim.map.relief[tile] === Relief.Hills) pros.push([0.5, "On a hill"]);

	const byWeight = (list: [number, string][]) => list.sort((a, b) => b[0] - a[0]).map(([, text]) => text);
	return { tile, problem, score: Math.round(score * 10) / 10, grade: grade(score), pros: byWeight(pros), cons: byWeight(cons) };
}

/**
 * The best places to found a city near a tile (known, foundable tiles within
 * `radius`), best first, at least three tiles apart.
 */
export function bestSites (sim: Sim, player: number, from: number, radius = 6, count = 3): SiteReport[] {
	const reports: SiteReport[] = [];
	for (const t of sim.tilesWithin(from, radius)) {
		if (!sim.knows(player, t) || foundProblem(sim, player, t)) continue;
		reports.push(rateSite(sim, player, t));
	}
	reports.sort((a, b) => b.score - a.score || a.tile - b.tile);
	const picked: SiteReport[] = [];
	for (const r of reports) {
		if (picked.length >= count) break;
		if (r.grade === "Poor") break;
		if (picked.some((p) => sim.distance(p.tile, r.tile) < 3)) continue;
		picked.push(r);
	}
	return picked;
}
