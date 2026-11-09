import { ambitionProblem, measure, target as milestoneTarget } from "./ambitions";
import { attackTargets, preview } from "./combat";
import { captureProblem, foundProblem, slotCap, slotsUsed, trainProblem, unitCost } from "./cities";
import { actionProblem, agreementCost, aiAccepts, attitude, closeBordersProblem, type DealTerms, justified, proposalProblem, strandedUnits, strength, warProblem, weariness } from "./diplomacy";
import { buildingStars, buildProblem, buyCost, networkNodes, rushCost, rushProblem, storedGoods } from "./economy";
import { researchCost } from "./effects";
import { search } from "./network";
import { mulberry32 } from "../noise";
import { reachable, type Reach } from "./movement";
import {
	type AgendaId, AMBITION_IDS, type AmbitionId, AMBITIONS, type BuildingId, BUILDINGS, type CivId, CIVS, Deposit, EXCHANGE_COST, type Good, GOOD_INFO, levelRewards,
	MONUMENT_IDS, ROAD_COST, TECH_IDS, type TechId, TECHS, UNIT_TYPES, type UnitTypeId, type WonderId
} from "./rules";
import type { Sim } from "./sim";
import { freeUnits, income, upkeep } from "./treasury";
import { type CityState, type Command, type DealKind, PEACE, type ProposalState, type UnitState, WAR } from "./types";

/**
 * A utility AI that plays through the same commands as a person, so it
 * works unchanged in online games. Each turn it chooses city rewards,
 * handles diplomacy, researches, grows its economy (buildings plus the
 * roads that connect them), moves and fights with its units, and trains
 * new ones. It only acts on what its own fog of war lets it see.
 */

/**
 * Play a turn for an AI civ (without ending it). Commands go through
 * `apply` when given (an online room applies and broadcasts them), straight
 * to the simulation otherwise.
 */
export function runAiTurn (sim: Sim, player: number, apply?: (command: Command) => boolean): void {
	const ai = new AiTurn(sim, player, apply);
	ai.run();
}

/** Food buildings, in order of preference: growth unlocks building slots. (Farms
 * make grain, which only feeds a city once milled and baked into bread.) */
const FOOD_BUILDINGS: BuildingId[] = ["hunter", "fishery"];

/** Ambitions each civ leans towards, and the one each leader's agenda suggests. */
const CIV_AMBITIONS: Record<CivId, AmbitionId[]> = {
	highlanders: ["conquest", "industry", "wonders"],
	riverfolk: ["industry", "diplomacy", "expansion"],
	woodlanders: ["wonders", "industry", "knowledge"],
	horselords: ["conquest", "expansion"],
	coastfolk: ["expansion", "knowledge", "diplomacy"],
	plainsfolk: ["expansion", "knowledge", "wonders"]
};
const AGENDA_AMBITION: Record<AgendaId, AmbitionId> = {
	expansionist: "expansion", merchant: "industry", militarist: "conquest", builder: "wonders", peacemaker: "diplomacy", scholar: "knowledge"
};

/** World wonders an AI civ prefers, most wanted first. */
const WONDER_ORDER: WonderId[] = ["greatLibrary", "hangingGardens", "grandBazaar", "colossus", "greatWall", "hallOfHeroes", "imperialRoad", "observatory", "councilHall", "grandExchange"];

class AiTurn {
	sim: Sim;
	p: number;
	targeted = new Set<number>();

	/**
	 * The AI's own random numbers, seeded per game, turn and civ. It must not
	 * draw from the simulation's RNG: clients replaying the command stream
	 * (online play, replays) would not make the same draws and would desync.
	 */
	rand: () => number;
	/** Stars held back for the next technology; other spending (but food) waits. */
	reserve = 0;
	/** Income after upkeep and administration, at the start of the turn. */
	net = 0;

	apply?: (command: Command) => boolean;

	constructor (sim: Sim, p: number, apply?: (command: Command) => boolean) {
		this.sim = sim;
		this.p = p;
		this.apply = apply;
		this.rand = mulberry32((sim.state.options.seed ^ Math.imul(sim.state.turn + 1, 0x9e3779b1) ^ Math.imul(p + 1, 0x85ebca6b)) >>> 0);
	}

	do (command: Command): boolean {
		return this.apply ? this.apply(command) : this.sim.apply(this.p, command).ok;
	}

	get stars (): number {
		return this.sim.player(this.p).stars;
	}

	run (): void {
		this.net = income(this.sim, this.p).net;
		this.rewards();
		this.ambition();
		this.diplomacy();
		this.research();
		this.economy();
		this.wonders();
		this.units();
		this.training();
	}

	/**
	 * Pick an ambition on the first turn (usually the one the leader's agenda
	 * suggests). One that hasn't paid off by turn 25 is swapped for whichever
	 * the civ is furthest along.
	 */
	ambition (): void {
		const sim = this.sim;
		const p = sim.player(this.p);
		if (p.ambition && p.milestones.length === 0 && sim.state.turn >= 25 && sim.state.turn % 10 === 5) {
			const progress = (a: AmbitionId) => {
				const m = AMBITIONS[a].milestones[0];
				return measure(sim, this.p, m.measure) / milestoneTarget(sim, m.measure, m.target);
			};
			const best = [...AMBITION_IDS].sort((a, b) => progress(b) - progress(a))[0];
			if (best !== p.ambition && progress(best) > progress(p.ambition)) this.do({ type: "ambition", ambition: best });
			return;
		}
		if (p.ambition) return;
		const options = CIV_AMBITIONS[p.civ];
		const pick = p.agenda && this.rand() < 0.6 ? AGENDA_AMBITION[p.agenda] : options[Math.floor(this.rand() * options.length)];
		if (!ambitionProblem(this.sim, this.p, pick)) this.do({ type: "ambition", ambition: pick });
	}

	// ------------------------------------------------------------------

	threatened (city: CityState): boolean {
		const sim = this.sim;
		return sim.tilesWithin(city.tile, 3).some((t) => {
			const u = sim.unitOn(t);
			return !!u && sim.atWar(this.p, u.owner) && sim.canSee(this.p, t);
		});
	}

	rewards (): void {
		for (const city of this.sim.citiesOf(this.p)) {
			while (city.pendingRewards > 0) {
				const [a, b] = levelRewards(city.level);
				const defensive = this.threatened(city);
				const pick = defensive ? (["walls", "warrior", "swordsman"].includes(b) ? b : a) : a === "warrior" ? b : a;
				if (!this.do({ type: "reward", city: city.id, reward: pick })) break;
			}
		}
	}

	atWarWithAnyone (): boolean {
		const sim = this.sim;
		return sim.state.players.some((q) => q.alive && q.index !== this.p && sim.atWar(this.p, q.index));
	}

	propose (to: number, kind: DealKind, terms: DealTerms = {}): boolean {
		if (proposalProblem(this.sim, this.p, to, kind, terms)) return false;
		return this.do({ type: "propose", to, kind, ...terms });
	}

	diplomacy (): void {
		const sim = this.sim;
		const mine = strength(sim, this.p);
		const aggression = sim.options.difficulty === "easy" ? 0.03 : sim.options.difficulty === "hard" ? 0.12 : 0.07;
		let bartered = false;
		for (const q of sim.state.players) {
			const o = q.index;
			if (o === this.p || !q.alive || !sim.hasMet(this.p, o)) continue;
			const theirs = strength(sim, o);
			const feel = attitude(sim, this.p, o);
			const relation = sim.relation(this.p, o);
			const chance = q.human ? 0.12 : 0.5;

			if (relation === WAR) {
				// Sue for peace when losing or no longer angry: other AIs only when they would agree, people every few turns
				if (mine < theirs * 0.7 || feel > -3 || weariness(sim, this.p, o) >= 3) {
					const offer: ProposalState = { id: -1, from: this.p, to: o, kind: "peace", stars: 0, turn: sim.state.turn };
					const ask = q.human ? (sim.state.turn + this.p) % 6 === 0 : aiAccepts(sim, o, offer);
					if (ask) this.propose(o, "peace");
				}
				continue;
			}

			const neighbour = sim.citiesOf(this.p).some((a) => sim.citiesOf(o).some((b) => sim.distance(a.tile, b.tile) <= 10));
			const fair = justified(sim, this.p, o);
			const grudge = (feel <= -2 && mine > theirs * 1.2) || (feel <= -6 && mine > theirs * 0.9) || (fair && mine > theirs);
			const conqueror = sim.player(this.p).ambition === "conquest";
			const opportunity = mine > theirs * (conqueror ? 1.4 : 2) && feel < 3;
			const odds = aggression * (fair ? 3 : 1) * (conqueror ? 2 : 1);
			if (relation === PEACE && neighbour && (grudge || opportunity) && this.rand() < odds && sim.state.turn > 8 && !warProblem(sim, this.p, o)) {
				this.do({ type: "declareWar", target: o });
				continue;
			}

			// Shut out a civ we've come to dislike
			if (feel <= -4 && this.rand() < 0.15 && !closeBordersProblem(sim, this.p, o) && !strandedUnits(sim, this.p, o).length) {
				this.do({ type: "closeBorders", target: o });
				continue;
			}

			// Treaties with civs we like
			if (relation === PEACE && feel >= 5 && this.rand() < chance && this.propose(o, "alliance")) continue;
			if (relation === PEACE && feel >= 3 && this.rand() < chance * 0.5 && this.propose(o, "pact")) continue;
			if (feel >= 1 && this.rand() < chance && this.propose(o, "trade")) continue;
			if (feel >= 2 && this.rand() < chance * 0.5 && this.propose(o, "openBorders")) continue;

			// Star-priced actions: spend a full treasury on friends, or against rivals
			if (feel >= -1 && feel < 6 && this.stars >= EXCHANGE_COST + 25 && this.rand() < 0.2 && this.propose(o, "exchange")) continue;
			if (feel >= 1 && this.spare >= agreementCost(sim, this.p) + 20 && this.rand() < 0.15 && this.propose(o, "research")) continue;
			if (feel <= -5 && this.stars >= 20 && this.rand() < 0.12 && !actionProblem(sim, this.p, o, "denounce")) {
				this.do({ type: "denounce", target: o });
				continue;
			}
			if (feel <= -7 && this.stars >= 60 && this.rand() < 0.1 && !actionProblem(sim, this.p, o, "sanction")) {
				this.do({ type: "sanction", target: o });
				continue;
			}

			// Demands on much weaker neighbours
			if (neighbour && feel < 0 && mine > theirs * 2 && this.rand() < 0.06) {
				this.propose(o, "tribute", { getStars: Math.min(25, 8 + Math.floor(sim.state.turn / 5)) });
				continue;
			}
			if (neighbour && feel <= -3 && mine > theirs * 3.5 && this.rand() < 0.03) {
				const city = sim.citiesOf(o).filter((c) => !c.capital && sim.citiesOf(this.p).some((m) => sim.distance(m.tile, c.tile) <= 5))
					.sort((a, b) => a.level - b.level || a.id - b.id)[0];
				if (city) this.propose(o, "city", { city: city.id });
				continue;
			}

			// Buy goods our construction sites are stuck without
			if (!bartered && feel >= 0 && this.rand() < 0.15) bartered = this.buyShortage(o);
		}
		// Answer proposals people sent us (AI-to-AI deals resolve immediately)
		for (const proposal of [...sim.state.diplomacy.proposals]) {
			if (proposal.to !== this.p) continue;
			const accept = aiAccepts(sim, this.p, proposal);
			if (!this.do({ type: "respond", proposal: proposal.id, accept })) this.do({ type: "respond", proposal: proposal.id, accept: false });
		}
	}

	/** Offer stars to another civ for a good that our construction sites are waiting on. */
	buyShortage (seller: number): boolean {
		const sim = this.sim;
		for (const b of sim.buildingsOf(this.p)) {
			if (b.built) continue;
			const stock = this.localStock(b.tile);
			for (const g of Object.keys(b.needs) as Good[]) {
				if ((stock[g] ?? 0) >= 0) continue;
				const count = Math.min(4, -(stock[g] ?? 0));
				const stars = Math.ceil(GOOD_INFO[g].price * count * 1.6);
				if (this.stars < stars + 10) return false;
				return this.propose(seller, "barter", { stars, get: { [g]: count } });
			}
		}
		return false;
	}

	research (): void {
		const sim = this.sim;
		const p = sim.player(this.p);
		const order: TechId[] = [...CIVS[p.civ].research];
		if (sim.options.victories.prosperity) order.push("engineering");
		if (sim.options.victories.diplomatic) order.push("statecraft");
		// Diplomacy (deals with other civs) right after Trade
		const tradeAt = order.indexOf("trade");
		if (!order.includes("diplomacy")) order.splice(tradeAt >= 0 ? tradeAt + 1 : order.length, 0, "diplomacy");
		if (this.atWarWithAnyone()) order.unshift("archery", "smithing");
		// Without hunting or fishing no city grows: that comes first
		if (!p.techs.includes("hunting") && !p.techs.includes("fishing")) order.unshift(this.nearDeposit(Deposit.Fish) ? "fishing" : "hunting");
		// Then everything else, cheapest first
		order.push(...TECH_IDS.filter((t) => !order.includes(t)).sort((a, b) => TECHS[a].tier - TECHS[b].tier));
		// Each wanted tech's missing prerequisites come just before it (lowest tier first)
		const planned: TechId[] = [];
		const plan = (t: TechId): void => {
			if (planned.includes(t) || p.techs.includes(t)) return;
			for (const r of [...TECHS[t].requires].sort((a, b) => TECHS[a].tier - TECHS[b].tier)) plan(r);
			planned.push(t);
		};
		for (const t of order) plan(t);
		for (const tech of planned) {
			if (p.techs.includes(tech)) continue;
			if (!TECHS[tech].requires.every((r) => p.techs.includes(r))) continue;
			const cost = researchCost(sim, this.p, tech);
			if (p.stars >= cost + 2) {
				this.do({ type: "research", tech });
			} else if (cost + 2 - p.stars <= Math.max(1, this.net) * 6) {
				// Within reach: save for it
				this.reserve = cost + 2;
			}
			break;
		}
	}

	/** Is there a deposit of this kind near any of our cities? */
	nearDeposit (deposit: Deposit): boolean {
		const sim = this.sim;
		return sim.citiesOf(this.p).some((c) => sim.tilesWithin(c.tile, c.radius + 1).some((t) => sim.map.deposit[t] === deposit));
	}

	/** Stars free to spend beyond the research reserve. */
	get spare (): number {
		return this.stars - this.reserve;
	}

	// ------------------------------------------------------------------
	// Economy
	// ------------------------------------------------------------------

	economy (): void {
		const sim = this.sim;
		this.connectCities();
		for (const city of sim.citiesOf(this.p)) {
			if (this.stars < 4) break;
			if (slotsUsed(sim, city) >= slotCap(city)) continue;
			this.placeBuilding(city, this.spare < 4);
		}
		this.buyShortages();
		this.rushStalled();
		// Connect anything left without a road
		for (const b of sim.buildingsOf(this.p)) {
			if (this.stars < ROAD_COST) break;
			if (!this.connected(b.tile)) this.connect(b.tile);
		}
		// Sell surplus once a market stands
		if (sim.buildingsOf(this.p).some((b) => b.type === "market" && b.built)) {
			const stock = storedGoods(sim, this.p);
			for (const [good, n] of Object.entries(stock) as [Good, number][]) {
				const selling = sim.player(this.p).sell.includes(good);
				if (!selling && n > 8) this.do({ type: "sell", good, on: true });
				if (selling && n < 3 && good !== "coins") this.do({ type: "sell", good, on: false });
			}
		}
	}

	/**
	 * Goods in the stores a tile's road network reaches, less what construction
	 * sites on that network are still waiting for.
	 */
	localStock (tile: number): Partial<Record<Good, number>> {
		const sim = this.sim;
		const nodes = networkNodes(sim, this.p);
		const reached = new Set(nodes[tile] ? search(sim).run(sim, nodes, tile) : [tile]);
		const stock: Partial<Record<Good, number>> = {};
		const add = (goods: Partial<Record<Good, number>>, sign: number) => {
			for (const [g, n] of Object.entries(goods) as [Good, number][]) stock[g] = (stock[g] ?? 0) + n * sign;
		};
		for (const t of reached) {
			const city = sim.cityOn(t);
			if (city && city.owner === this.p) add(city.store, 1);
			const b = sim.buildingOn(t);
			if (b && b.owner === this.p && b.type === "warehouse" && b.built) add(b.store, 1);
		}
		for (const b of sim.buildingsOf(this.p)) if (!b.built && reached.has(b.tile)) add(b.needs, -1);
		return stock;
	}

	/** Can the materials be found without starving sites already waiting? */
	canSupply (type: BuildingId, stock: Partial<Record<Good, number>>): boolean {
		return (Object.entries(BUILDINGS[type].materials) as [Good, number][]).every(([g, n]) => (stock[g] ?? 0) >= n);
	}

	/** With stars to spare, buy what construction sites are short of at a market on their road network. */
	buyShortages (): void {
		const sim = this.sim;
		const markets = sim.buildingsOf(this.p).filter((b) => b.type === "market" && b.built);
		if (!markets.length || this.spare < 50) return;
		const nodes = networkNodes(sim, this.p);
		for (const site of sim.buildingsOf(this.p)) {
			if (site.built || this.spare < 50) continue;
			const stock = this.localStock(site.tile);
			const reached = new Set(nodes[site.tile] ? search(sim).run(sim, nodes, site.tile) : []);
			const market = markets.find((m) => reached.has(m.tile));
			if (!market) continue;
			for (const g of Object.keys(site.needs) as Good[]) {
				const short = -(stock[g] ?? 0);
				if (short <= 0 || sim.player(this.p).sell.includes(g)) continue;
				const count = Math.min(short, 10, Math.floor((this.spare - 40) / buyCost(g, 1)));
				if (count > 0) this.do({ type: "buy", building: market.id, good: g, count });
			}
		}
	}

	/**
	 * Spend spare stars finishing sites: ones whose network can't supply them
	 * when a few stars are spare, any site when the treasury is overflowing.
	 */
	rushStalled (): void {
		const rich = this.stars > 60;
		const sites = this.sim.buildingsOf(this.p).filter((b) => {
			if (b.built || rushProblem(this.sim, this.p, b) !== null) return false;
			if (rich) return true;
			const stock = this.localStock(b.tile);
			return (Object.keys(b.needs) as Good[]).some((g) => (stock[g] ?? 0) < 0);
		}).sort((a, b) => rushCost(a) - rushCost(b));
		for (const b of sites) {
			if (this.spare - rushCost(b) < (rich ? 40 : 10)) break;
			this.do({ type: "rush", building: b.id });
		}
	}

	/**
	 * One new building for a city: food first (every city wants to grow), then
	 * whatever the civ as a whole is shortest of, against targets that scale
	 * with its number of cities.
	 */
	placeBuilding (city: CityState, foodOnly = false): void {
		const sim = this.sim;
		const stock = this.localStock(city.tile);
		const mine = sim.buildingsOf(this.p);
		const here = mine.filter((b) => b.city === city.id);
		const food = here.filter((b) => FOOD_BUILDINGS.includes(b.type)).length;
		if (food < (city.level >= 3 ? 2 : 1)) {
			for (const type of FOOD_BUILDINGS) {
				if (sim.hasTech(this.p, BUILDINGS[type].tech) && this.placeType(city, type, stock)) return;
			}
		}
		if (foodOnly) return;
		for (const [type, target] of this.targets(mine)) {
			if (target <= 0 || mine.filter((b) => b.type === type).length >= target) continue;
			if (!sim.hasTech(this.p, BUILDINGS[type].tech)) continue;
			if (this.placeType(city, type, stock)) return;
		}
	}

	/** How many of each building the civ wants, in order of priority. */
	targets (mine: { type: BuildingId; built: boolean; tile: number }[]): [BuildingId, number][] {
		const sim = this.sim;
		const c = sim.citiesOf(this.p).length;
		const count = (type: BuildingId) => mine.filter((b) => b.type === type).length;
		const mined = (deposit: Deposit) => mine.some((b) => b.type === "mine" && sim.map.deposit[b.tile] === deposit);
		const bakes = sim.hasTech(this.p, "milling");
		const smelts = mined(Deposit.Ore) && mined(Deposit.Coal);
		return [
			["woodcutter", 1 + Math.floor(c / 2)],
			["sawmill", Math.max(1, Math.ceil(count("woodcutter") * 0.6))],
			["quarry", 1 + Math.floor(c / 4)],
			["farm", bakes ? 1 + Math.floor(c / 3) : 0],
			["mill", count("farm")],
			["bakery", count("mill")],
			["market", c >= 3 ? 1 + Math.floor(c / 8) : 0],
			["mine", 2 + Math.floor(c / 4)],
			["smelter", smelts ? 1 + Math.floor(c / 8) : 0],
			["toolsmith", smelts ? 1 : 0],
			["armoury", smelts ? 1 : 0],
			["mint", mined(Deposit.Gold) && mined(Deposit.Coal) ? 1 : 0],
			["pasture", sim.player(this.p).civ === "horselords" ? 0 : 1],
			["warehouse", Math.floor(c / 6)],
			["hunter", 99],
			["fishery", 99]
		];
	}

	/** Place a building near a city; with a stock, only if its materials are on hand. */
	placeType (city: CityState, type: BuildingId, stock?: Partial<Record<Good, number>>): boolean {
		const sim = this.sim;
		if (stock && !this.canSupply(type, stock)) return false;
		// Mines prefer deposits the civ doesn't dig yet (ore and coal make iron; gold and coal, coins)
		const minedAlready = new Set(sim.buildingsOf(this.p).filter((b) => b.type === "mine").map((b) => sim.map.deposit[b.tile]));
		const fresh = (t: number) => (type === "mine" && minedAlready.has(sim.map.deposit[t]) ? 1 : 0);
		const tiles = sim.tilesWithin(city.tile, city.radius)
			.filter((t) => sim.tileCity[t] === city.id && buildProblem(sim, this.p, t, type) === null)
			.sort((a, b) => fresh(a) - fresh(b) || sim.distance(city.tile, a) - sim.distance(city.tile, b) || a - b);
		const tile = tiles[0];
		if (tile === undefined) return false;
		if (!this.do({ type: "build", tile, building: type })) return false;
		this.connect(tile);
		return true;
	}

	/** Link every city to the capital's road network so materials can reach it. */
	connectCities (): void {
		const sim = this.sim;
		const cities = sim.citiesOf(this.p);
		const capital = cities.find((c) => c.capital) ?? cities[0];
		if (!capital) return;
		for (const city of cities) {
			if (city === capital || this.stars < 4) continue;
			const nodes = networkNodes(sim, this.p);
			const reached = this.component(nodes, capital.tile);
			if (reached.has(city.tile)) continue;
			// Across the water, ports join the networks; on the same land, roads do
			if (sim.map.landmass[city.tile] !== sim.map.landmass[capital.tile]) this.linkBySea(capital, city);
			else this.buildRoadPath(city.tile, (t) => reached.has(t));
		}
	}

	/** Make sure both cities have a port (ports on the same sea are joined by sea lanes). */
	linkBySea (a: CityState, b: CityState): void {
		const sim = this.sim;
		if (!sim.hasTech(this.p, "sailing")) return;
		for (const city of [a, b]) {
			if (sim.buildingsOf(this.p).some((x) => x.type === "port" && x.city === city.id)) continue;
			if (this.spare < 8 || slotsUsed(sim, city) >= slotCap(city)) continue;
			this.placeType(city, "port");
		}
	}

	/** Tiles of the network connected to a tile (by road, or by sea between ports). */
	component (nodes: Uint8Array, start: number): Set<number> {
		return new Set(nodes[start] ? search(this.sim).run(this.sim, nodes, start, 100000) : [start]);
	}

	/** Build roads from a tile along the shortest buildable path to a tile matching `goal`. */
	buildRoadPath (from: number, goal: (t: number) => boolean): void {
		const sim = this.sim;
		const prev = new Map<number, number>([[from, -1]]);
		const queue = [from];
		let reached = -1;
		for (let i = 0; i < queue.length && reached < 0 && i < 1500; i++) {
			const t = queue[i];
			for (const n of sim.neighbors(t)) {
				if (prev.has(n)) continue;
				if (goal(n)) {
					prev.set(n, t);
					reached = n;
					break;
				}
				const passable = sim.roads[n] === this.p || (sim.buildingOn(n)?.owner === this.p) || this.roadable(n);
				if (!passable) continue;
				prev.set(n, t);
				queue.push(n);
			}
		}
		if (reached < 0) return;
		for (let t = prev.get(reached) as number; t !== from && t >= 0; t = prev.get(t) as number) {
			if (this.stars < ROAD_COST) return;
			if (sim.roads[t] !== this.p && sim.buildingAt[t] < 0) this.do({ type: "road", tile: t });
		}
	}

	/** Could a road go here once the road reaches it? (Own or neutral land, no road or city yet.) */
	roadable (tile: number): boolean {
		const sim = this.sim;
		const owner = sim.map.owner[tile];
		return sim.isPassableLand(tile) && sim.roads[tile] < 0 && sim.cityAt[tile] < 0 && (owner < 0 || owner === this.p);
	}

	connected (tile: number): boolean {
		const sim = this.sim;
		return sim.neighbors(tile).some((n) => sim.roads[n] === this.p || (sim.cityOn(n)?.owner === this.p) || (sim.buildingOn(n)?.owner === this.p));
	}

	/** Build roads along the shortest buildable path to the civ's network. */
	connect (tile: number): void {
		if (this.connected(tile)) return;
		const nodes = networkNodes(this.sim, this.p);
		this.buildRoadPath(tile, (t) => nodes[t] === 1 && t !== tile);
	}

	// ------------------------------------------------------------------
	// Wonders and monuments
	// ------------------------------------------------------------------

	/**
	 * Raise earned monuments in small cities (each grows its city a level), and
	 * race for one world wonder at a time once the treasury allows.
	 */
	wonders (): void {
		const sim = this.sim;
		const p = sim.player(this.p);
		const cities = sim.citiesOf(this.p);
		if (!cities.length) return;
		const mine = sim.buildingsOf(this.p);
		for (const m of MONUMENT_IDS) {
			if (!p.feats.includes(m) || mine.some((b) => b.type === m)) continue;
			if (this.spare < buildingStars(sim, this.p, m) + 10) break;
			const small = [...cities].sort((a, b) => a.level - b.level || a.id - b.id);
			for (const city of small) if (this.placeType(city, m)) break;
			break;
		}
		const keen = p.ambition === "wonders";
		const racing = mine.filter((b) => !b.built && BUILDINGS[b.type].wonder === "world").length;
		const rich = this.stars > 150;
		if (racing >= (keen || rich ? 2 : 1) || cities.length < (keen ? 2 : 3)) return;
		for (const w of WONDER_ORDER) {
			const info = BUILDINGS[w];
			if (!sim.hasTech(this.p, info.tech)) continue;
			if (w === "grandExchange" && !sim.options.victories.prosperity) continue;
			if (this.spare < buildingStars(sim, this.p, w) + (keen || w === "grandExchange" ? 5 : 15)) continue;
			if (!this.canMake(info.materials)) continue;
			const capital = cities.find((c) => c.capital) ?? cities[0];
			const placed = [capital, ...cities.filter((c) => c !== capital)].some((city) => this.placeType(city, w));
			if (placed) return;
		}
	}

	/** Does the civ make (or hold) every good on a list, so a site for it won't stall for good? */
	canMake (goods: Partial<Record<Good, number>>): boolean {
		const sim = this.sim;
		const stock = storedGoods(sim, this.p);
		const made = new Set<Good>();
		for (const b of sim.buildingsOf(this.p)) {
			if (!b.built) continue;
			for (const g of Object.keys(BUILDINGS[b.type].outputs) as Good[]) made.add(g);
			if (b.type === "mine") {
				const d = sim.map.deposit[b.tile];
				made.add(d === Deposit.Ore ? "ore" : d === Deposit.Coal ? "coal" : "gold");
			}
		}
		return (Object.entries(goods) as [Good, number][]).every(([g, n]) => made.has(g) || (stock[g] ?? 0) >= n);
	}

	// ------------------------------------------------------------------
	// Units
	// ------------------------------------------------------------------

	units (): void {
		const sim = this.sim;
		for (const unit of [...sim.unitsOf(this.p)]) {
			if (!sim.unit(unit.id)) continue;
			this.actUnit(unit);
		}
	}

	actUnit (unit: UnitState): void {
		const sim = this.sim;
		if (captureProblem(sim, this.p, unit.id) === null) {
			this.do({ type: "capture", unit: unit.id });
			return;
		}
		if (UNIT_TYPES[unit.type].founder) {
			this.actSettler(unit);
			return;
		}
		if (this.tryAttack(unit)) return;

		const reach = reachable(sim, unit);
		if (!reach.tiles.length) return;

		const target = this.goal(unit);
		if (target >= 0) {
			this.moveToward(unit, reach, target);
			this.tryAttack(unit);
			return;
		}
		// Explore: the reachable tile that reveals the most unexplored land
		let best = -1, bestScore = 0;
		for (const t of reach.tiles) {
			const s = sim.fog.unexploredInSight(this.p, t, sim.fog.sightRadius(t, 2)) + this.rand() * 0.5;
			if (s > bestScore) {
				bestScore = s;
				best = t;
			}
		}
		if (best >= 0) this.do({ type: "move", unit: unit.id, to: best });
	}

	tryAttack (unit: UnitState): boolean {
		const sim = this.sim;
		const live = sim.unit(unit.id);
		if (!live || live.attacked) return false;
		let bestTile = -1, bestValue = 0;
		for (const t of attackTargets(sim, live)) {
			const target = sim.unitOn(t)!;
			const r = preview(sim, live, target);
			if (r.dies && !r.kills) continue;
			const value = (r.kills ? 10 : 0) + r.damage - r.retaliation;
			if (value > bestValue) {
				bestValue = value;
				bestTile = t;
			}
		}
		if (bestTile < 0) return false;
		return this.do({ type: "attack", unit: unit.id, target: bestTile });
	}

	/** Where a unit should head: enemy cities at war, then villages, then threats near home. */
	goal (unit: UnitState): number {
		const sim = this.sim;
		let best = -1, bestDist = Infinity;
		const consider = (tile: number, weight: number) => {
			if (this.targeted.has(tile)) return;
			const d = sim.distance(unit.tile, tile) * weight;
			if (d < bestDist) {
				bestDist = d;
				best = tile;
			}
		};
		for (const city of sim.state.cities) {
			if (city.owner === this.p || !sim.knows(this.p, city.tile)) continue;
			if (city.owner < 0) consider(city.tile, 1);
			else if (sim.atWar(this.p, city.owner)) consider(city.tile, 0.8);
		}
		for (const u of sim.state.units) {
			if (u.owner !== this.p && sim.atWar(this.p, u.owner) && sim.canSee(this.p, u.tile)) consider(u.tile, 1.2);
		}
		if (best >= 0 && bestDist <= 16) {
			if (sim.cityOn(best)) this.targeted.add(best);
			return best;
		}
		return -1;
	}

	moveToward (unit: UnitState, reach: Reach, target: number): void {
		const sim = this.sim;
		let best = -1, bestDist = sim.distance(unit.tile, target);
		for (const t of reach.tiles) {
			const d = sim.distance(t, target);
			if (d < bestDist || (d === bestDist && best >= 0 && (reach.cost.get(t) ?? 0) < (reach.cost.get(best) ?? 0))) {
				bestDist = d;
				best = t;
			}
		}
		if (best >= 0) this.do({ type: "move", unit: unit.id, to: best });
	}

	actSettler (unit: UnitState): void {
		const sim = this.sim;
		if (foundProblem(sim, this.p, unit.tile) === null && unit.moves > 0) {
			this.do({ type: "found", unit: unit.id });
			return;
		}
		// Nearest good site within 7 tiles that we know about
		let site = -1, siteDist = Infinity;
		for (const t of sim.tilesWithin(unit.tile, 7)) {
			if (!sim.knows(this.p, t) || foundProblem(sim, this.p, t) !== null || this.targeted.has(t)) continue;
			const d = sim.distance(unit.tile, t);
			if (d < siteDist) {
				siteDist = d;
				site = t;
			}
		}
		const reach = reachable(sim, unit);
		if (site >= 0) {
			this.targeted.add(site);
			if (reach.tiles.includes(site)) this.do({ type: "move", unit: unit.id, to: site });
			else this.moveToward(unit, reach, site);
			const live = sim.unit(unit.id);
			if (live && foundProblem(sim, this.p, live.tile) === null && live.moves > 0) this.do({ type: "found", unit: unit.id });
		} else if (reach.tiles.length) {
			const t = reach.tiles[Math.floor(this.rand() * reach.tiles.length)];
			this.do({ type: "move", unit: unit.id, to: t });
		}
	}

	// ------------------------------------------------------------------
	// Training
	// ------------------------------------------------------------------

	/** In peacetime, a civ whose income can't carry its army lets some of it go (weakest first, garrisons last). */
	trimArmy (): void {
		const sim = this.sim;
		if (this.atWarWithAnyone() || this.net >= 1) return;
		for (let k = 0; k < 2; k++) {
			if (upkeep(sim, this.p) <= 0 || income(sim, this.p).net >= 1) return;
			const units = sim.unitsOf(this.p).filter((u) => !UNIT_TYPES[u.type].founder);
			if (units.length <= Math.min(freeUnits(sim, this.p), sim.citiesOf(this.p).length)) return;
			const value = (u: UnitState) => UNIT_TYPES[u.type].attack + UNIT_TYPES[u.type].defence + (sim.cityAt[u.tile] >= 0 ? 10 : 0);
			units.sort((a, b) => value(a) - value(b) || b.id - a.id);
			this.do({ type: "disband", unit: units[0].id });
		}
	}

	training (): void {
		const sim = this.sim;
		this.trimArmy();
		const cities = sim.citiesOf(this.p);
		const units = sim.unitsOf(this.p);
		const war = this.atWarWithAnyone();
		const extra = sim.options.difficulty === "hard" ? 2 : sim.options.difficulty === "easy" ? -1 : 0;
		// A full treasury goes into a bigger army (and from there, into wars)
		const wealth = Math.min(cities.length * 2, Math.floor(this.stars / 40));
		const target = Math.ceil(cities.length * 1.5) + 2 + (war ? 3 : 0) + extra + wealth;
		const settlers = units.filter((u) => UNIT_TYPES[u.type].founder).length;

		// Upkeep: keep a margin of income after paying for the army (less in wartime)
		const margin = war ? -2 : 1 + Math.floor(cities.length / 3);
		let net = income(sim, this.p).net;
		for (const city of cities) {
			if (sim.unitAt[city.tile] >= 0) continue;
			const army = sim.unitsOf(this.p).filter((u) => !UNIT_TYPES[u.type].founder).length;
			let choice: UnitTypeId | null = null;
			const affordable = (type: UnitTypeId) => (net - UNIT_TYPES[type].upkeep >= margin || (war && this.stars > 30)) && (war || this.spare >= unitCost(sim, this.p, type).stars);
			if (sim.options.allowFounding && settlers === 0 && cities.length < 6 && this.stars >= 7 && trainProblem(sim, this.p, city.id, "settler") === null) {
				choice = "settler";
			} else if (army < target) {
				for (const type of ["swordsman", "catapult", "rider", "archer", "warrior"] as UnitTypeId[]) {
					if (type === "catapult" && !war) continue;
					if (!affordable(type)) continue;
					if (trainProblem(sim, this.p, city.id, type) === null) {
						choice = type;
						break;
					}
				}
			}
			if (choice && this.do({ type: "train", city: city.id, unit: choice })) net = income(sim, this.p).net;
		}
	}
}

