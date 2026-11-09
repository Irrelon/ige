import { HexMap } from "../mapGen";
import { Feature, Relief, Terrain } from "../terrain";
import { runAiTurn } from "./ai";
import { preview } from "./combat";
import { economyPhase, rushCost, total } from "./economy";
import { reachable } from "./movement";
import { ambitionProblem, ambitionScore, checkAmbition } from "./ambitions";
import { createCity } from "./cities";
import { networkNodes, SEA } from "./network";
import { attitude, councilVote, grievance, hasPact, pickAgenda, warProblem } from "./diplomacy";
import { researchCost } from "./effects";
import { administration, BUILDINGS, CARRIER_SPEED, levelIncome, ROAD_CAPACITY, type TechId, TECH_IDS, techCost } from "./rules";
import { income, upkeep } from "./treasury";
import { defaultOptions, Sim } from "./sim";
import { ALLIANCE, type Command, type GameOptions, PEACE, type UnitState, WAR } from "./types";

/** A flat grassland map with capitals at the given tiles and no villages. */
function blank (players: number, starts: number[], overrides: Partial<GameOptions> = {}): Sim {
	const width = 24, height = 16;
	const map = new HexMap(width, height, 7);
	map.terrain.fill(Terrain.Grassland);
	map.relief.fill(Relief.Flat);
	map.shade.fill(1);
	map.landmass.fill(0);
	map.landmassSizes = [map.count];
	const options = defaultOptions({ width, height, players, humans: [0], fog: "off", allowFounding: true, ...overrides });
	const sim = Sim.create(options, { map, starts, villages: false });
	sim.drainEvents();
	return sim;
}

function meetAll (sim: Sim): void {
	const n = sim.playerCount;
	for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) sim.state.diplomacy.met[a * n + b] = 1;
	// Deals other than peace need the Diplomacy tech
	for (const p of sim.state.players) if (!p.techs.includes("diplomacy")) p.techs.push("diplomacy");
}

function give (sim: Sim, p: number, ...techs: TechId[]): void {
	sim.player(p).techs.push(...techs);
}

/** End turns until it's `player`'s turn again (other players do nothing). */
function nextTurn (sim: Sim, player = 0): void {
	do {
		expect(sim.apply(sim.current, { type: "endTurn" }).ok).toBe(true);
	} while (sim.current !== player && !sim.state.winner);
}

function clearUnits (sim: Sim): void {
	for (const u of [...sim.state.units]) sim.removeUnit(u, "disbanded");
}

function playAi (sim: Sim, turns: number): void {
	const end = sim.state.turn + turns;
	while (sim.state.turn < end && !sim.state.winner) {
		const p = sim.current;
		runAiTurn(sim, p);
		sim.apply(p, { type: "endTurn" });
		sim.drainEvents();
	}
}

describe("movement", () => {
	test("a unit with moves left may step into rough ground, which ends its move", () => {
		const sim = blank(2, [sim2(0, 2), sim2(20, 12)]);
		clearUnits(sim);
		const from = sim.map.index(10, 6);
		const flat = sim.map.index(11, 6);
		const forest = sim.map.index(12, 6);
		sim.map.feature[forest] = Feature.Forest;
		const u = sim.createUnit("warrior", 0, from, true);
		const reach = reachable(sim, u);
		expect(reach.tiles).toContain(forest); // 1 move to the flat tile, then the forest takes the last
		expect(sim.apply(0, { type: "move", unit: u.id, to: forest }).ok).toBe(true);
		expect(u.moves).toBe(0);
		expect(reach.cost.get(flat)).toBe(1);
	});

	test("units pass through friendly units but not others, and never stop on them", () => {
		const sim = blank(2, [sim2(0, 2), sim2(20, 12)]);
		clearUnits(sim);
		meetAll(sim);
		const u = sim.createUnit("warrior", 0, sim.map.index(10, 6), true);
		const friend = sim.createUnit("warrior", 0, sim.map.index(11, 6), true);
		const beyond = sim.map.index(12, 6);
		let reach = reachable(sim, u);
		expect(reach.tiles).not.toContain(friend.tile);
		expect(reach.tiles).toContain(beyond);
		sim.removeUnit(friend, "disbanded");
		const stranger = sim.createUnit("warrior", 1, sim.map.index(11, 6), true);
		reach = reachable(sim, u);
		expect(reach.tiles).not.toContain(stranger.tile);
		expect(reach.cost.get(beyond) ?? 99).toBeGreaterThan(1); // must go round
	});
});

describe("combat", () => {
	test("warriors on open ground trade 5 damage each way", () => {
		const sim = blank(2, [sim2(0, 2), sim2(20, 12)]);
		clearUnits(sim);
		meetAll(sim);
		const a = sim.createUnit("warrior", 0, sim.map.index(10, 6), true);
		const b = sim.createUnit("warrior", 1, sim.map.index(11, 6), true);
		expect(sim.apply(0, { type: "attack", unit: a.id, target: b.tile }).ok).toBe(false); // at peace
		expect(sim.apply(0, { type: "declareWar", target: 1 }).ok).toBe(true);
		expect(preview(sim, a, b)).toEqual({ damage: 5, retaliation: 5, kills: false, dies: false });
		expect(sim.apply(0, { type: "attack", unit: a.id, target: b.tile }).ok).toBe(true);
		expect(a.hp).toBe(5);
		expect(b.hp).toBe(5);
		expect(sim.apply(0, { type: "move", unit: a.id, to: sim.map.index(9, 6) }).ok).toBe(false); // no moving after attacking
	});

	test("forest gives defence and ranged attacks take no retaliation", () => {
		const sim = blank(2, [sim2(0, 2), sim2(20, 12)]);
		clearUnits(sim);
		meetAll(sim);
		give(sim, 0, "archery");
		const target = sim.map.index(12, 6);
		sim.map.feature[target] = Feature.Forest;
		const archer = sim.createUnit("archer", 0, sim.map.index(10, 6), true);
		const warrior = sim.createUnit("warrior", 1, target, true);
		sim.apply(0, { type: "declareWar", target: 1 });
		const r = preview(sim, archer, warrior);
		expect(r.retaliation).toBe(0);
		expect(r.damage).toBe(Math.round((2 / (2 + 3)) * 2 * 4.5));
	});

	test("killing a unit moves a melee attacker in and counts kills", () => {
		const sim = blank(2, [sim2(0, 2), sim2(20, 12)]);
		clearUnits(sim);
		meetAll(sim);
		const a = sim.createUnit("warrior", 0, sim.map.index(10, 6), true);
		const b = sim.createUnit("warrior", 1, sim.map.index(11, 6), true);
		b.hp = 3;
		sim.apply(0, { type: "declareWar", target: 1 });
		expect(sim.apply(0, { type: "attack", unit: a.id, target: b.tile }).ok).toBe(true);
		expect(sim.unit(b.id)).toBeUndefined();
		expect(a.tile).toBe(sim.map.index(11, 6));
		expect(sim.player(0).stats.kills).toBe(1);
	});
});

describe("cities", () => {
	test("a unit that starts its turn on a village captures it", () => {
		const sim = blank(2, [sim2(2, 2), sim2(20, 12)]);
		clearUnits(sim);
		const villageTile = sim.map.index(8, 6);
		const village = sim.state.cities.find((c) => c.owner === -1) ?? (() => {
			return createCity(sim, -1, villageTile, false);
		})();
		const w = sim.createUnit("warrior", 0, sim.map.index(7, 6), true);
		expect(sim.apply(0, { type: "move", unit: w.id, to: village.tile }).ok).toBe(true);
		expect(sim.apply(0, { type: "capture", unit: w.id }).ok).toBe(false);
		nextTurn(sim);
		expect(sim.apply(0, { type: "capture", unit: w.id }).ok).toBe(true);
		expect(village.owner).toBe(0);
		expect(sim.map.owner[sim.map.neighbor(village.tile, 0)]).toBe(0);
	});

	test("the Allow founding cities option gates settlers", () => {
		const off = blank(2, [sim2(2, 2), sim2(20, 12)], { allowFounding: false });
		expect(off.state.units.some((u) => u.type === "settler")).toBe(false);
		const capital = off.citiesOf(0)[0];
		clearUnits(off);
		off.player(0).stars = 50;
		capital.store.fish = 5;
		expect(off.apply(0, { type: "train", city: capital.id, unit: "settler" }).ok).toBe(false);

		const on = blank(2, [sim2(2, 2), sim2(20, 12)], { allowFounding: true });
		const settler = on.state.units.find((u) => u.type === "settler" && u.owner === 0)!;
		const far = on.map.index(8, 8);
		on.relocateUnit(settler, far);
		expect(on.apply(0, { type: "found", unit: settler.id }).ok).toBe(true);
		expect(on.cityOn(far)?.owner).toBe(0);
	});

	test("food deliveries grow a city and offer a level reward", () => {
		const sim = blank(2, [sim2(2, 2), sim2(20, 12)]);
		const capital = sim.citiesOf(0)[0];
		capital.store.fish = 2;
		nextTurn(sim);
		expect(capital.level).toBe(2);
		expect(capital.pendingRewards).toBe(1);
		const stars = sim.player(0).stars;
		expect(sim.apply(0, { type: "reward", city: capital.id, reward: "income" }).ok).toBe(true);
		nextTurn(sim);
		// Income: level 2 + capital 1 + reward 1
		expect(sim.player(0).stars).toBe(stars + 4);
	});
});

describe("economy", () => {
	test("construction is supplied by road, then a woodcutter and sawmill turn logs into planks", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)]);
		give(sim, 0, "forestry", "sawmills");
		sim.player(0).stars = 30;
		const capital = sim.citiesOf(0)[0];
		const forest = sim.map.neighbor(capital.tile, 0);
		const mill = sim.map.neighbor(capital.tile, 3);
		sim.map.feature[forest] = Feature.Forest;
		expect(sim.apply(0, { type: "build", tile: forest, building: "woodcutter" }).ok).toBe(true);
		const woodcutter = sim.buildingOn(forest)!;
		expect(woodcutter.built).toBe(true); // woodcutters cost only stars, so the chain can always restart
		expect(sim.apply(0, { type: "build", tile: mill, building: "sawmill" }).ok).toBe(true);
		const sawmill = sim.buildingOn(mill)!;
		expect(sawmill.built).toBe(false);
		const planksAtStart = capital.store.planks ?? 0;

		nextTurn(sim); // logs arrive from the capital's store, the sawmill finishes
		expect(sawmill.built).toBe(true);

		for (let i = 0; i < 6; i++) nextTurn(sim);
		expect(sim.player(0).stats.produced).toBeGreaterThan(6);
		expect(capital.store.planks ?? 0).toBeGreaterThan(planksAtStart);
	});

	test("rushing finishes a site for stars", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)]);
		give(sim, 0, "mining");
		sim.player(0).stars = 20;
		const capital = sim.citiesOf(0)[0];
		capital.store = {};
		const hills = sim.map.neighbor(capital.tile, 1);
		sim.map.relief[hills] = Relief.Hills;
		expect(sim.apply(0, { type: "build", tile: hills, building: "quarry" }).ok).toBe(true);
		const quarry = sim.buildingOn(hills)!;
		expect(quarry.built).toBe(false);
		const before = sim.player(0).stars;
		expect(rushCost(quarry)).toBe(2); // one log: its market price times four, at least 2 stars a good
		expect(sim.apply(0, { type: "rush", building: quarry.id }).ok).toBe(true);
		expect(quarry.built).toBe(true);
		expect(sim.player(0).stars).toBe(before - 2);
	});

	test("city level caps building slots", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)]);
		give(sim, 0, "forestry");
		sim.player(0).stars = 50;
		const capital = sim.citiesOf(0)[0];
		const spots = sim.tilesWithin(capital.tile, 2).filter((t) => t !== capital.tile);
		spots.forEach((t) => (sim.map.feature[t] = Feature.Forest));
		expect(sim.apply(0, { type: "build", tile: spots[0], building: "woodcutter" }).ok).toBe(true);
		expect(sim.apply(0, { type: "build", tile: spots[1], building: "woodcutter" }).ok).toBe(true);
		const third = sim.apply(0, { type: "build", tile: spots[2], building: "woodcutter" });
		expect(third.ok).toBe(false);
		expect(third.error).toMatch(/no free building slot/);
	});

	test("roads limit how many loads pass per turn", () => {
		const sim = blank(2, [sim2(2, 8), sim2(22, 1)]);
		const capital = sim.citiesOf(0)[0];
		const path: number[] = [];
		for (let c = 2; c <= 14; c++) {
			const t = sim.map.index(c, 8);
			path.push(t);
			if (t !== capital.tile) sim.roads[t] = 0;
		}
		path.reverse(); // from the far end to the capital
		for (let i = 0; i < 6; i++) {
			sim.state.cargo.push({ id: sim.nextId(), owner: 0, good: "logs", path: [...path], at: 0, destKind: "city", dest: capital.id, purpose: "store" });
		}
		economyPhase(sim, 0, []);
		const positions = sim.state.cargo.map((c) => c.at);
		expect(positions.filter((at) => at === CARRIER_SPEED).length).toBe(ROAD_CAPACITY);
		expect(positions.filter((at) => at === 0).length).toBe(6 - ROAD_CAPACITY);
	});

	test("cargo reroutes around a cut road", () => {
		const sim = blank(2, [sim2(2, 8), sim2(22, 1)]);
		const capital = sim.citiesOf(0)[0];
		// Two parallel roads; cut the first one after loading
		const top: number[] = [], bottom: number[] = [];
		for (let c = 3; c <= 8; c++) {
			top.push(sim.map.index(c, 8));
			bottom.push(sim.map.index(c, 9));
		}
		[...top, ...bottom].forEach((t) => (sim.roads[t] = 0));
		const route = [...top].reverse().concat([capital.tile]);
		sim.state.cargo.push({ id: sim.nextId(), owner: 0, good: "stone", path: route, at: 0, destKind: "city", dest: capital.id, purpose: "store" });
		sim.roads[sim.map.index(5, 8)] = -1;
		const stoneBefore = capital.store.stone ?? 0;
		economyPhase(sim, 0, []);
		economyPhase(sim, 0, []);
		expect(capital.store.stone).toBe(stoneBefore + 1);
	});
});

describe("diplomacy and victory", () => {
	test("allies are pulled into a defensive war", () => {
		const sim = blank(3, [sim2(2, 2), sim2(20, 2), sim2(12, 13)]);
		meetAll(sim);
		const n = 3;
		sim.state.diplomacy.attitude[2 * n + 1] = 8;
		sim.state.diplomacy.attitude[1 * n + 2] = 8;
		sim.state.current = 1;
		expect(sim.apply(1, { type: "propose", to: 2, kind: "alliance" }).ok).toBe(true);
		expect(sim.relation(1, 2)).toBe(ALLIANCE);
		sim.state.current = 0;
		expect(sim.apply(0, { type: "declareWar", target: 1 }).ok).toBe(true);
		expect(sim.relation(0, 1)).toBe(WAR);
		expect(sim.relation(0, 2)).toBe(WAR);
	});

	test("a peace proposal to a human waits for an answer", () => {
		const sim = blank(2, [sim2(2, 2), sim2(20, 12)], { humans: [0, 1] });
		meetAll(sim);
		sim.apply(0, { type: "declareWar", target: 1 });
		expect(sim.apply(0, { type: "propose", to: 1, kind: "peace" }).ok).toBe(true);
		expect(sim.relation(0, 1)).toBe(WAR);
		const proposal = sim.state.diplomacy.proposals[0];
		expect(sim.apply(1, { type: "respond", proposal: proposal.id, accept: true }).ok).toBe(true);
		expect(sim.relation(0, 1)).toBe(PEACE);
	});

	test("alliance victory when every surviving civ is allied", () => {
		const sim = blank(2, [sim2(2, 2), sim2(20, 12)], { humans: [0, 1] });
		meetAll(sim);
		sim.apply(0, { type: "propose", to: 1, kind: "alliance" });
		const proposal = sim.state.diplomacy.proposals[0];
		sim.apply(1, { type: "respond", proposal: proposal.id, accept: true });
		expect(sim.state.winner).toEqual({ type: "alliance", players: [0, 1] });
	});

	test("capturing the last city eliminates a civ (domination)", () => {
		const sim = blank(2, [sim2(2, 2), sim2(8, 2)]);
		meetAll(sim);
		clearUnits(sim);
		const enemyCapital = sim.citiesOf(1)[0];
		const w = sim.createUnit("warrior", 0, enemyCapital.tile, true);
		sim.apply(0, { type: "declareWar", target: 1 });
		w.acted = false;
		expect(sim.apply(0, { type: "capture", unit: w.id }).ok).toBe(true);
		expect(sim.player(1).alive).toBe(false);
		expect(sim.state.winner).toEqual({ type: "domination", players: [0] });
	});

	test("the Grand Exchange wins a prosperity victory", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)]);
		give(sim, 0, "engineering");
		sim.player(0).stars = 200;
		const tile = sim.map.neighbor(sim.citiesOf(0)[0].tile, 0);
		expect(sim.apply(0, { type: "build", tile, building: "grandExchange" }).ok).toBe(true);
		const wonder = sim.buildingOn(tile)!;
		expect(total(wonder.needs)).toBeGreaterThan(0);
		expect(sim.apply(0, { type: "rush", building: wonder.id }).ok).toBe(false); // wonders can't be rushed
		// Stock the capital with everything it needs; carriers deliver it next turn
		const capital = sim.citiesOf(0)[0];
		for (const [g, n] of Object.entries(wonder.needs)) capital.store[g as keyof typeof capital.store] = (capital.store[g as keyof typeof capital.store] ?? 0) + (n as number);
		for (let i = 0; i < 20 && !sim.state.winner; i++) nextTurn(sim); // 34 goods at 2 loads a turn
		expect(wonder.built).toBe(true);
		expect(sim.state.winner?.type).toBe("prosperity");
	});

	test("the World Council needs backing from other civs, not just size", () => {
		const sim = blank(3, [sim2(4, 4), sim2(20, 12), sim2(4, 12)], { humans: [] });
		meetAll(sim);
		const n = sim.playerCount;
		const capital = sim.citiesOf(0)[0];
		capital.level = 30; // far bigger than everyone else put together
		councilVote(sim);
		expect(sim.state.diplomacy.council.lastWinner).toBe(-1); // a majority alone isn't enough
		// Both rivals come to admire civ 0 and vote for it
		sim.state.diplomacy.attitude[1 * n + 0] = 6;
		sim.state.diplomacy.attitude[2 * n + 0] = 6;
		councilVote(sim);
		expect(sim.state.diplomacy.council.lastWinner).toBe(0);
		expect(sim.state.diplomacy.council.streak).toBe(1);
	});

	test("score victory after the turn limit", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)], { turnLimit: 3 });
		for (let i = 0; i < 3 && !sim.state.winner; i++) nextTurn(sim);
		expect(sim.state.winner?.type).toBe("score");
	});
});

describe("stars: upkeep, administration and income", () => {
	test("units beyond the free allowance cost upkeep; a civ that can't pay disbands its newest", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)]);
		clearUnits(sim);
		// One city keeps 3 + 1 = 4 units for free
		const units: UnitState[] = [];
		for (let i = 0; i < 6; i++) units.push(sim.createUnit("warrior", 0, sim2(2 + i, 9), true));
		expect(upkeep(sim, 0)).toBe(2);
		const gross = income(sim, 0).gross;
		sim.player(0).stars = 10;
		nextTurn(sim);
		expect(sim.player(0).stars).toBe(10 + gross - 2);
		// Broke: the newest units are disbanded until the rest can be paid for
		for (let i = 0; i < 4; i++) units.push(sim.createUnit("warrior", 0, sim2(2 + i, 11), true));
		expect(upkeep(sim, 0)).toBe(6);
		sim.player(0).stars = 0;
		nextTurn(sim);
		const left = sim.unitsOf(0).map((u) => u.id);
		expect(left).toEqual(units.slice(0, 6).map((u) => u.id));
		expect(sim.player(0).stars).toBe(0);
	});

	test("city income grows more slowly at high levels; very wide civs pay administration", () => {
		expect([1, 2, 3, 4, 5, 6, 7, 8].map(levelIncome)).toEqual([1, 2, 2, 3, 3, 4, 4, 5]);
		expect([10, 11, 20, 21, 30, 31].map(administration)).toEqual([0, 1, 10, 12, 30, 33]);
	});
});

describe("wonders and monuments", () => {
	test("a world wonder goes to the first civ to finish it; rivals get their goods and half their stars back", () => {
		const sim = blank(2, [sim2(4, 4), sim2(18, 10)], { humans: [0, 1] });
		give(sim, 0, "trade");
		give(sim, 1, "trade");
		sim.player(0).stars = 100;
		sim.player(1).stars = 100;
		const a = sim.citiesOf(0)[0], b = sim.citiesOf(1)[0];
		a.store = { planks: 8, stone: 6 };
		b.store = {};
		const ta = sim.map.neighbor(a.tile, 0), tb = sim.map.neighbor(b.tile, 0);
		expect(sim.apply(0, { type: "build", tile: ta, building: "greatLibrary" }).ok).toBe(true);
		expect(sim.apply(0, { type: "build", tile: sim.map.neighbor(a.tile, 2), building: "greatLibrary" }).ok).toBe(false);
		const siteA = sim.buildingOn(ta)!;
		expect(siteA.paid).toBe(15 + 2); // base price plus 2 per city
		expect(sim.apply(0, { type: "rush", building: siteA.id }).ok).toBe(false); // world wonders can't be rushed
		expect(sim.apply(0, { type: "endTurn" }).ok).toBe(true);
		expect(sim.apply(1, { type: "build", tile: tb, building: "greatLibrary" }).ok).toBe(true);
		sim.buildingOn(tb)!.needs = { planks: 5, stone: 6 }; // 3 planks already delivered
		expect(sim.apply(1, { type: "endTurn" }).ok).toBe(true);
		for (let i = 0; i < 10 && !siteA.built; i++) nextTurn(sim);
		expect(siteA.built).toBe(true);
		expect(sim.buildingOn(tb)).toBeUndefined();
		expect(b.store.planks).toBe(3);
		const events = sim.drainEvents();
		expect(events.some((e) => e.type === "stars" && e.player === 1 && e.reason === "Great Library lost" && e.amount === 8)).toBe(true);
		expect(events.some((e) => e.type === "wonder" && e.player === 0 && e.lost.includes(1))).toBe(true);
		// The Great Library makes research cheaper; nobody else can start one now
		expect(researchCost(sim, 0, "sawmills")).toBe(Math.ceil(techCost("sawmills", 1) * 0.75));
		sim.player(1).stars = 100;
		expect(sim.apply(sim.current, { type: "build", tile: tb, building: "greatLibrary" }).ok).toBe(false);
	});

	test("monuments are earned by feats, can be rushed, and raise their city a level", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)]);
		const p = sim.player(0);
		const city = sim.citiesOf(0)[0];
		const tile = sim.map.neighbor(city.tile, 0);
		p.stars = 200;
		expect(sim.apply(0, { type: "build", tile, building: "gildedVault" }).ok).toBe(false);
		nextTurn(sim); // 100 stars in the bank at the start of a turn earns the Gilded Vault
		expect(p.feats).toContain("gildedVault");
		const level = city.level;
		expect(sim.apply(0, { type: "build", tile, building: "gildedVault" }).ok).toBe(true);
		const monument = sim.buildingOn(tile)!;
		expect(sim.apply(0, { type: "rush", building: monument.id }).ok).toBe(true);
		expect(city.level).toBe(level + 1);
		expect(sim.apply(0, { type: "build", tile: sim.map.neighbor(city.tile, 2), building: "gildedVault" }).ok).toBe(false);
	});
});

describe("markets and ports", () => {
	test("markets sell goods at twice the price; carriers take them to construction sites", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)]);
		give(sim, 0, "trade", "mining");
		const p = sim.player(0);
		p.stars = 100;
		const capital = sim.citiesOf(0)[0];
		capital.level = 4;
		const marketTile = sim.map.neighbor(capital.tile, 0);
		expect(sim.apply(0, { type: "build", tile: marketTile, building: "market" }).ok).toBe(true);
		const market = sim.buildingOn(marketTile)!;
		expect(sim.apply(0, { type: "rush", building: market.id }).ok).toBe(true);
		capital.store = {};
		const hills = sim.map.neighbor(capital.tile, 3);
		sim.map.relief[hills] = Relief.Hills;
		expect(sim.apply(0, { type: "build", tile: hills, building: "quarry" }).ok).toBe(true);
		const quarry = sim.buildingOn(hills)!;
		expect(quarry.built).toBe(false); // needs a log nobody has
		const before = p.stars;
		expect(sim.apply(0, { type: "buy", building: market.id, good: "logs", count: 1 }).ok).toBe(true);
		expect(p.stars).toBe(before - 1); // logs cost half a star at market, at least 1 to buy
		expect(sim.apply(0, { type: "buy", building: market.id, good: "coins", count: 1 }).ok).toBe(false);
		nextTurn(sim);
		expect(quarry.built).toBe(true);
	});

	test("ports join cities across the water with sea lanes that carriers sail", () => {
		const sim = blank(2, [sim2(5, 4), sim2(20, 13)]);
		give(sim, 0, "sailing");
		for (let r = 0; r < 16; r++) {
			for (const c of [8, 9]) {
				sim.map.terrain[sim2(c, r)] = Terrain.Ocean;
				sim.map.relief[sim2(c, r)] = Relief.Water;
			}
		}
		const capital = sim.citiesOf(0)[0];
		const far = createCity(sim, 0, sim2(11, 4), false);
		far.level = 3;
		capital.level = 3;
		capital.store = { planks: 10, stone: 4 };
		far.store = {};
		sim.player(0).stars = 100;
		sim.roads[sim2(6, 4)] = 0;
		expect(sim.apply(0, { type: "build", tile: sim2(7, 4), building: "port" }).ok).toBe(true);
		expect(sim.apply(0, { type: "build", tile: sim2(10, 4), building: "port" }).ok).toBe(true);
		expect(sim.apply(0, { type: "build", tile: sim2(4, 5), building: "port" }).ok).toBe(false); // not on the coast
		for (let i = 0; i < 6; i++) nextTurn(sim);
		expect(sim.buildingOn(sim2(7, 4))!.built).toBe(true);
		expect(sim.buildingOn(sim2(10, 4))!.built).toBe(true); // its planks and stone sailed across from the capital
		const nodes = networkNodes(sim, 0);
		expect([sim2(8, 4), sim2(9, 4), sim2(8, 3), sim2(9, 3), sim2(8, 5), sim2(9, 5)].some((t) => nodes[t] === SEA)).toBe(true);
		// A site in the far city is supplied from the capital's store, by sea
		give(sim, 0, "construction");
		expect(sim.apply(0, { type: "build", tile: sim2(12, 4), building: "warehouse" }).ok).toBe(true);
		capital.store.planks = 4;
		capital.store.stone = 4;
		for (let i = 0; i < 8 && !sim.buildingOn(sim2(12, 4))!.built; i++) nextTurn(sim);
		expect(sim.buildingOn(sim2(12, 4))!.built).toBe(true);
	});
});

describe("long sea crossings", () => {
	test("sea lanes have no length limit, and ships sail four tiles for each road tile", () => {
		// A 96-wide map: land at both ends, an 80-tile sea between
		const width = 96, height = 12;
		const map = new HexMap(width, height, 7);
		map.terrain.fill(Terrain.Grassland);
		map.relief.fill(Relief.Flat);
		map.shade.fill(1);
		map.landmass.fill(0);
		map.landmassSizes = [map.count];
		for (let r = 0; r < height; r++) {
			for (let c = 8; c < 88; c++) {
				map.terrain[r * width + c] = Terrain.Ocean;
				map.relief[r * width + c] = Relief.Water;
			}
		}
		const at = (c: number, r: number) => r * width + c;
		const sim = Sim.create(defaultOptions({ width, height, players: 2, humans: [0, 1], fog: "off" }), { map, starts: [at(5, 5), at(92, 9)], villages: false });
		sim.drainEvents();
		sim.player(0).techs.push("sailing", "trade", "construction");
		const capital = sim.citiesOf(0)[0];
		const far = createCity(sim, 0, at(89, 5), false);
		capital.level = 4;
		far.level = 4;
		capital.store = { planks: 12, stone: 6 };
		far.store = {};
		sim.player(0).stars = 200;
		sim.roads[at(6, 5)] = 0;
		expect(sim.apply(0, { type: "build", tile: at(7, 5), building: "port" }).ok).toBe(true);
		expect(sim.apply(0, { type: "build", tile: at(88, 5), building: "port" }).ok).toBe(true);
		const lanes = networkNodes(sim, 0).reduce((n, v) => n + (v === SEA ? 1 : 0), 0);
		expect(lanes).toBeGreaterThanOrEqual(80);
		// 80 sea tiles at 16 a turn: the far port is built from the capital's planks within a few turns
		for (let i = 0; i < 10 && !sim.buildingOn(at(88, 5))!.built; i++) nextTurn(sim);
		expect(sim.buildingOn(at(88, 5))!.built).toBe(true);
		expect(sim.apply(0, { type: "build", tile: at(90, 5), building: "warehouse" }).ok).toBe(true);
		for (let i = 0; i < 10 && !sim.buildingOn(at(90, 5))!.built; i++) nextTurn(sim);
		expect(sim.buildingOn(at(90, 5))!.built).toBe(true);
	});
});

describe("ambitions", () => {
	test("milestones pay double to the first civ to reach them; all four earn the legacy", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)], { humans: [0, 1] });
		const p0 = sim.player(0), p1 = sim.player(1);
		const five: TechId[] = ["forestry", "mining", "farming", "hunting", "fishing"];
		expect(sim.apply(0, { type: "ambition", ambition: "knowledge" }).ok).toBe(true);
		p0.techs = [...five];
		const before = p0.stars;
		expect(sim.apply(0, { type: "endTurn" }).ok).toBe(true);
		expect(p0.milestones).toEqual([0]);
		expect(sim.state.firsts["knowledge:0"]).toBe(0);
		expect(p0.stars).toBe(before + 10); // 5 stars, doubled for being first
		expect(ambitionProblem(sim, 0, "conquest")).toMatch(/committed/);
		// Civ 1 picks the same ambition after already knowing 5 techs: paid, but not as the first
		p1.techs = [...five];
		const p1Before = p1.stars;
		expect(sim.apply(1, { type: "ambition", ambition: "knowledge" }).ok).toBe(true);
		expect(p1.milestones).toEqual([0]);
		expect(p1.stars).toBe(p1Before + 5);
		// Civ 0 reaches the rest: the Enlightened legacy halves research
		p0.techs = TECH_IDS.slice(0, 17);
		checkAmbition(sim, 0);
		expect(p0.milestones.length).toBe(4);
		expect(p0.legacy).toBe(true);
		expect(researchCost(sim, 0, "engineering")).toBe(Math.ceil(techCost("engineering", 1) * 0.5));
		expect(ambitionScore(sim, 0)).toBe(4 * 20 + 30 + 50);
		expect(ambitionScore(sim, 1)).toBe(10);
	});
});

describe("diplomacy II", () => {
	test("deals need the Diplomacy tech on both sides; war and peace don't", () => {
		const sim = blank(2, [sim2(2, 2), sim2(20, 12)], { humans: [0, 1] });
		const n = sim.playerCount;
		for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) sim.state.diplomacy.met[a * n + b] = 1;
		expect(sim.apply(0, { type: "propose", to: 1, kind: "openBorders" }).ok).toBe(false);
		expect(sim.apply(0, { type: "denounce", target: 1 }).ok).toBe(false);
		expect(sim.apply(0, { type: "declareWar", target: 1 }).ok).toBe(true);
		expect(sim.apply(0, { type: "propose", to: 1, kind: "peace" }).ok).toBe(true);
		give(sim, 0, "diplomacy");
		sim.apply(1, { type: "respond", proposal: sim.state.diplomacy.proposals[0].id, accept: true });
		expect(sim.apply(0, { type: "propose", to: 1, kind: "openBorders" }).error).toBe("They haven't researched Diplomacy");
		give(sim, 1, "diplomacy");
		expect(sim.apply(0, { type: "propose", to: 1, kind: "openBorders" }).ok).toBe(true);
	});

	test("a surprise war angers everyone; a war with grievances behind it doesn't", () => {
		const sim = blank(3, [sim2(2, 2), sim2(20, 2), sim2(12, 13)], { humans: [0, 1, 2] });
		meetAll(sim);
		expect(sim.apply(0, { type: "declareWar", target: 1 }).ok).toBe(true);
		expect(attitude(sim, 2, 0)).toBe(-2);
		expect(grievance(sim, 1, 0)).toBe(6);
		expect(grievance(sim, 2, 0)).toBe(1.5);
		sim.state.diplomacy.grievance[2 * 3 + 0] = 5; // civ 2 now has grounds against civ 0
		sim.state.current = 2;
		const before = attitude(sim, 1, 2);
		expect(sim.apply(2, { type: "declareWar", target: 0 }).ok).toBe(true);
		expect(attitude(sim, 1, 2)).toBe(before);
	});

	test("peace starts a truce; a defensive pact pulls its partner into a war", () => {
		const sim = blank(3, [sim2(2, 2), sim2(20, 2), sim2(12, 13)], { humans: [0, 1, 2] });
		meetAll(sim);
		sim.apply(0, { type: "declareWar", target: 1 });
		sim.apply(0, { type: "propose", to: 1, kind: "peace" });
		expect(sim.apply(1, { type: "respond", proposal: sim.state.diplomacy.proposals[0].id, accept: true }).ok).toBe(true);
		expect(warProblem(sim, 0, 1)).toBe("Truce until turn 11");
		expect(sim.apply(0, { type: "declareWar", target: 1 }).ok).toBe(false);
		sim.state.current = 1;
		expect(sim.apply(1, { type: "propose", to: 2, kind: "pact" }).ok).toBe(true);
		expect(sim.apply(2, { type: "respond", proposal: sim.state.diplomacy.proposals[0].id, accept: true }).ok).toBe(true);
		expect(hasPact(sim, 1, 2)).toBe(true);
		sim.state.turn = 12;
		sim.state.current = 0;
		expect(sim.apply(0, { type: "declareWar", target: 1 }).ok).toBe(true);
		expect(sim.relation(2, 0)).toBe(WAR);
	});

	test("barter swaps goods and stars; trade routes deliver every round while the roads touch", () => {
		const sim = blank(2, [sim2(4, 4), sim2(9, 4)], { humans: [0, 1] });
		meetAll(sim);
		const a = sim.citiesOf(0)[0], b = sim.citiesOf(1)[0];
		a.store = { planks: 6 };
		b.store = {};
		sim.player(0).stars = 10;
		sim.player(1).stars = 20;
		expect(sim.apply(0, { type: "propose", to: 1, kind: "barter", give: { planks: 5 }, getStars: 8 }).ok).toBe(true);
		expect(sim.apply(1, { type: "respond", proposal: sim.state.diplomacy.proposals[0].id, accept: true }).ok).toBe(true);
		expect(a.store.planks).toBe(1);
		expect(b.store.planks).toBe(5);
		expect(sim.player(0).stars).toBe(18);
		expect(sim.player(1).stars).toBe(12);
		// Routes need the two road networks to touch
		const route = { type: "propose" as const, to: 1, kind: "barter" as const, give: { planks: 1 }, getStars: 1, turns: 10 };
		expect(sim.apply(0, route).ok).toBe(false);
		sim.roads[sim2(5, 4)] = 0;
		sim.roads[sim2(6, 4)] = 0;
		sim.roads[sim2(7, 4)] = 1;
		sim.roads[sim2(8, 4)] = 1;
		a.store.planks = 5;
		expect(sim.apply(0, route).ok).toBe(true);
		expect(sim.apply(1, { type: "respond", proposal: sim.state.diplomacy.proposals[0].id, accept: true }).ok).toBe(true);
		nextTurn(sim);
		nextTurn(sim);
		// Each round a plank leaves civ 0's capital as cargo along both civs' roads (5 tiles, 4 a turn)
		expect(a.store.planks).toBe(3);
		expect(b.store.planks).toBe(6);
		expect(sim.state.cargo.filter((c) => c.receiver === 1 && c.good === "planks").length).toBe(1);
	});

	test("a refused demand gives grievances; research agreements pay out a technology", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)], { humans: [0, 1] });
		meetAll(sim);
		expect(sim.apply(0, { type: "propose", to: 1, kind: "tribute", getStars: 5 }).ok).toBe(true);
		expect(sim.apply(1, { type: "respond", proposal: sim.state.diplomacy.proposals[0].id, accept: false }).ok).toBe(true);
		expect(grievance(sim, 0, 1)).toBe(3);
		expect(attitude(sim, 1, 0)).toBe(-2);
		sim.player(0).stars = 20;
		sim.player(1).stars = 20;
		expect(sim.apply(0, { type: "propose", to: 1, kind: "research" }).ok).toBe(true);
		expect(sim.apply(1, { type: "respond", proposal: sim.state.diplomacy.proposals[0].id, accept: true }).ok).toBe(true);
		expect(sim.player(0).stars).toBe(20 - 12); // 10 stars plus 2 per city
		const techs = [sim.player(0).techs.length, sim.player(1).techs.length];
		for (let i = 0; i < 8; i++) nextTurn(sim);
		expect([sim.player(0).techs.length, sim.player(1).techs.length]).toEqual([techs[0] + 1, techs[1] + 1]);
	});

	test("sanctions cut the target's income; denouncing sours relations", () => {
		const sim = blank(2, [sim2(4, 4), sim2(20, 12)], { humans: [0, 1] });
		meetAll(sim);
		sim.player(0).stars = 40;
		expect(sim.apply(0, { type: "sanction", target: 1 }).ok).toBe(true);
		expect(sim.player(0).stars).toBe(25);
		expect(income(sim, 1).sanctions).toBe(1);
		expect(sim.apply(0, { type: "sanction", target: 1 }).ok).toBe(false);
		expect(sim.apply(0, { type: "denounce", target: 1 }).ok).toBe(true);
		expect(attitude(sim, 1, 0)).toBe(-7);
		expect(grievance(sim, 1, 0)).toBe(4);
	});

	test("online seat changes are game commands, allowed out of turn", () => {
		const sim = blank(3, [sim2(2, 2), sim2(20, 2), sim2(12, 13)], { humans: [0] });
		expect(sim.current).toBe(0);
		expect(sim.apply(2, { type: "seat", player: 2, human: true }).ok).toBe(true);
		expect(sim.isHuman(2)).toBe(true);
		expect(sim.apply(2, { type: "seat", player: 2, human: false }).ok).toBe(true);
		expect(sim.isHuman(2)).toBe(false);
	});

	test("AI leaders get a fixed agenda; old saves load with the new state filled in", () => {
		const sim = blank(3, [sim2(2, 2), sim2(20, 2), sim2(12, 13)]);
		expect(sim.player(0).agenda).toBeNull();
		expect(sim.player(1).agenda).toBe(pickAgenda(sim.options.seed, 1));
		const data = JSON.parse(sim.serialize());
		for (const p of data.state.players) {
			delete p.feats;
			delete p.ambition;
			delete p.agenda;
			delete p.stats.conquered;
		}
		delete data.state.diplomacy.grievance;
		delete data.state.firsts;
		const loaded = Sim.load(JSON.stringify(data));
		expect(loaded.player(2).agenda).toBe(pickAgenda(sim.options.seed, 2));
		expect(loaded.state.diplomacy.grievance.length).toBe(9);
		expect(loaded.player(0).feats).toEqual([]);
	});
});

describe("determinism, saving and the AI", () => {
	const options = defaultOptions({ width: 40, height: 28, players: 4, humans: [], seed: 12345 });

	test("the same game played twice is identical", () => {
		const a = Sim.create(options);
		const b = Sim.create(options);
		playAi(a, 15);
		playAi(b, 15);
		expect(a.serialize()).toBe(b.serialize());
	});

	test("save and load continues exactly", () => {
		const a = Sim.create(options);
		playAi(a, 10);
		const b = Sim.load(a.serialize());
		playAi(a, 10);
		playAi(b, 10);
		expect(b.serialize()).toBe(a.serialize());
	});

	test("replaying the command stream reproduces an AI game (online play and replays)", () => {
		const a = Sim.create(options);
		const log: { player: number; command: Command }[] = [];
		a.onApplied = (player, command) => log.push({ player, command: JSON.parse(JSON.stringify(command)) });
		playAi(a, 20);
		const b = Sim.create(options);
		for (const { player, command } of log) expect(b.apply(player, command).ok).toBe(true);
		expect(b.serialize()).toBe(a.serialize());
	});

	test("AI soak game: civs expand, build, trade goods and fight", () => {
		const sim = Sim.create(defaultOptions({ width: 48, height: 32, players: 4, humans: [], seed: 777, turnLimit: 80 }));
		playAi(sim, 80);
		const stats = sim.state.players.map((p) => p.stats);
		const summary = {
			turn: sim.state.turn,
			winner: sim.state.winner,
			cities: sim.state.players.map((p) => sim.citiesOf(p.index).length),
			buildings: sim.state.players.map((p) => sim.buildingsOf(p.index).filter((b) => b.built).length),
			techs: sim.state.players.map((p) => p.techs.length),
			delivered: stats.map((s) => s.delivered),
			produced: stats.map((s) => s.produced),
			kills: stats.map((s) => s.kills),
			captured: stats.map((s) => s.captured)
		};
		console.log(JSON.stringify(summary));
		expect(stats.some((s) => s.captured > 0)).toBe(true);
		// Every AI picks an ambition, and monuments get built
		expect(sim.state.players.every((p) => p.ambition !== null)).toBe(true);
		expect(sim.state.players.some((p) => p.milestones.length > 0)).toBe(true);
		expect(sim.state.buildings.some((b) => b.built && BUILDINGS[b.type].wonder)).toBe(true);
		expect(summary.buildings.reduce((a, b) => a + b, 0)).toBeGreaterThan(8);
		expect(stats.reduce((a, s) => a + s.delivered, 0)).toBeGreaterThan(20);
	}, 120000);
});

/** Tile index on the 24 x 16 test map. */
function sim2 (col: number, row: number): number {
	return row * 24 + col;
}
