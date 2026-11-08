import { Feature, Relief, Terrain } from "../terrain";
import { addGrowth, foodValue, slotCap, slotsUsed } from "./cities";
import { marketFactor, roadBonus } from "./effects";
import { wonderCompleted, wonderProblem } from "./wonders";
import { fail, ok } from "./result";
import {
	BUFFER_SIZE, type BuildingId, BUILDINGS, BUY_PRICE, CARRIER_SPEED, Deposit, DEPOSIT_GOOD, type Good, GOOD_INFO, type Goods,
	isFood, ROAD_CAPACITY, ROAD_COST, RUSH_PRICE, TECHS
} from "./rules";
import type { Sim } from "./sim";
import { availableGoods, networkNodes, search, takeGoods } from "./network";
import type { BuildingState, CargoPurpose, CargoState, CityState, CommandResult, Priority } from "./types";

export { availableGoods, networkNodes, takeGoods };

/**
 * The Settlers-style economy.
 *
 * Buildings are placed as construction sites and finished by materials
 * carried to them. Every turn (the owner's economy phase):
 *   1. producers with their inputs make goods into a small output slot
 *   2. consumers ask for what they need (construction sites, workshops,
 *      cities wanting food, markets), in the civ's priority order; each
 *      request is served by the nearest source over the road network
 *   3. unrequested output is carried to the nearest store (city or
 *      warehouse) or, for goods marked for sale, to a market
 *   4. cargo moves along roads, a few tiles per turn, with only so many
 *      loads entering each road tile per turn (jams are real)
 *   5. deliveries land: inputs, materials, food (city growth), stock, sales
 * The road network of a civ is its road tiles plus its cities and buildings.
 */

// ------------------------------------------------------------------
// Placement
// ------------------------------------------------------------------

function isWooded (sim: Sim, tile: number): boolean {
	return sim.map.feature[tile] !== Feature.None && sim.map.relief[tile] !== Relief.Mountain;
}

function siteOk (sim: Sim, type: BuildingId, tile: number): string | null {
	const map = sim.map;
	const relief = map.relief[tile] as Relief;
	const terrain = map.terrain[tile] as Terrain;
	switch (BUILDINGS[type].site) {
		case "forest": return isWooded(sim, tile) ? null : "Must be in a forest";
		case "forestGame": return isWooded(sim, tile) && map.deposit[tile] === Deposit.Game ? null : "Needs a forest with game";
		case "quarry": return relief === Relief.Hills || sim.neighbors(tile).some((n) => map.relief[n] === Relief.Mountain) ? null : "Needs hills or a mountain next to it";
		case "mine": return relief === Relief.Hills && [Deposit.Ore, Deposit.Coal, Deposit.Gold].includes(map.deposit[tile]) ? null : "Needs hills with ore, coal or gold";
		case "farmland": return relief === Relief.Flat && (terrain === Terrain.Grassland || terrain === Terrain.Plains) && map.feature[tile] === Feature.None ? null : "Needs open flat grassland or plains";
		case "coastFish": return sim.neighbors(tile).some((n) => map.isWater(n) && map.deposit[n] === Deposit.Fish) ? null : "Needs fish in the water next to it";
		case "coast": return sim.neighbors(tile).some((n) => map.isWater(n) && map.terrain[n] !== Terrain.Ice) ? null : "Must be on the coast";
		case "pasture": return relief === Relief.Flat && map.deposit[tile] === Deposit.Horses ? null : "Needs a horse herd";
		case "land": return null;
		case "city": return sim.cityAt[tile] >= 0 ? null : "Must be built on a city";
	}
}

/** Why a building can't be placed here, or null if it can (stars are checked too). */
export function buildProblem (sim: Sim, player: number, tile: number, type: BuildingId): string | null {
	const info = BUILDINGS[type];
	if (!info) return "Unknown building";
	if (!sim.hasTech(player, info.tech)) return `Needs ${TECHS[info.tech!].name}`;
	if (type === "grandExchange" && !sim.options.victories.prosperity) return "Prosperity victory is off in this game";
	if (sim.map.owner[tile] !== player) return "Must be inside your territory";
	const city = sim.city(sim.tileCity[tile]);
	if (!city || city.owner !== player) return "Must be inside your territory";
	if (sim.buildingAt[tile] >= 0) return "There is already a building here";
	const unit = sim.unitOn(tile);
	if (unit && unit.owner !== player) return "An enemy unit is in the way";
	if (info.site === "city") {
		if (sim.cityAt[tile] < 0) return "Must be built on a city";
		if (city.walls) return "The city already has walls";
	} else {
		if (sim.cityAt[tile] >= 0) return "Can't build on a city tile";
		if (!sim.isPassableLand(tile)) return "Must be on land";
	}
	const site = siteOk(sim, type, tile);
	if (site) return site;
	if (info.slot && slotsUsed(sim, city) >= slotCap(city)) return `${city.name} has no free building slot (level ${city.level})`;
	const wonder = info.wonder ? wonderProblem(sim, player, type) : null;
	if (wonder) return wonder;
	const stars = buildingStars(sim, player, type);
	if (sim.player(player).stars < stars) return `Needs ${stars} stars`;
	return null;
}

/**
 * Buildings to offer on a tile, with why each can't be built yet (null when it
 * can). Resource buildings that suit the site are listed even before their tech
 * is researched, so players learn what the land is good for; buildable ones come
 * first.
 */
export function buildOptions (sim: Sim, player: number, tile: number): { type: BuildingId; problem: string | null }[] {
	const out: { type: BuildingId; problem: string | null }[] = [];
	for (const type of Object.keys(BUILDINGS) as BuildingId[]) {
		const info = BUILDINGS[type];
		if (info.wonder) continue;
		const resource = info.site !== "land" && info.site !== "city";
		if (!resource && !sim.hasTech(player, info.tech)) continue;
		if (resource && siteOk(sim, type, tile) !== null) continue;
		if (info.site === "city" && sim.cityAt[tile] < 0) continue;
		if (info.site !== "city" && sim.cityAt[tile] >= 0) continue;
		out.push({ type, problem: buildProblem(sim, player, tile, type) });
	}
	return out.sort((a, b) => Number(a.problem !== null) - Number(b.problem !== null));
}

/** Stars to place a building: wonders and monuments cost more for bigger civs. */
export function buildingStars (sim: Sim, player: number, type: BuildingId): number {
	const info = BUILDINGS[type];
	const cities = sim.citiesOf(player).length;
	if (info.wonder === "world") return info.stars + 2 * cities;
	if (info.wonder === "monument") return info.stars + cities;
	return info.stars;
}

/**
 * World wonders and monuments to offer on a tile: world wonders whose tech is
 * known and that nobody has finished, and monuments already earned.
 */
export function wonderOptions (sim: Sim, player: number, tile: number): { type: BuildingId; problem: string | null }[] {
	const p = sim.player(player);
	const out: { type: BuildingId; problem: string | null }[] = [];
	if (sim.cityAt[tile] >= 0) return out;
	for (const type of Object.keys(BUILDINGS) as BuildingId[]) {
		const info = BUILDINGS[type];
		if (!info.wonder || !sim.hasTech(player, info.tech)) continue;
		if (info.wonder === "world" && sim.state.buildings.some((b) => b.type === type && (b.built || b.owner === player))) continue;
		if (info.wonder === "monument" && (!p.feats.includes(type) || sim.state.buildings.some((b) => b.type === type && b.owner === player))) continue;
		if (type === "grandExchange" && !sim.options.victories.prosperity) continue;
		out.push({ type, problem: buildProblem(sim, player, tile, type) });
	}
	return out;
}

export function buildCommand (sim: Sim, player: number, tile: number, type: BuildingId): CommandResult {
	const problem = buildProblem(sim, player, tile, type);
	if (problem) return fail(problem);
	const info = BUILDINGS[type];
	const stars = buildingStars(sim, player, type);
	sim.player(player).stars -= stars;
	const building: BuildingState = {
		id: sim.nextId(),
		type,
		owner: player,
		tile,
		city: sim.tileCity[tile],
		built: false,
		needs: { ...info.materials },
		input: {},
		output: {},
		store: {},
		status: "Waiting for materials",
		paid: stars
	};
	sim.addBuilding(building);
	// Woods are cleared for anything but woodcutters and hunters
	if (info.site !== "forest" && info.site !== "forestGame" && info.site !== "city" && sim.map.feature[tile] !== Feature.None) {
		sim.map.feature[tile] = Feature.None;
		sim.emit({ type: "featureCleared", tile });
	}
	sim.emit({ type: "stars", player, amount: -stars, reason: info.name });
	sim.emit({ type: "buildingPlaced", building: building.id });
	if (total(building.needs) === 0) completeBuilding(sim, building);
	return ok();
}

/** Stars needed to finish a construction site right now. */
export function rushCost (building: BuildingState): number {
	let stars = 0;
	for (const [g, n] of Object.entries(building.needs) as [Good, number][]) stars += n * Math.max(2, GOOD_INFO[g].price * RUSH_PRICE);
	return Math.ceil(stars);
}

/** Why a site can't be rushed, or null. */
export function rushProblem (sim: Sim, player: number, building: BuildingState | undefined): string | null {
	if (!building || building.owner !== player) return "Not your building";
	if (building.built) return "Already finished";
	if (BUILDINGS[building.type].wonder === "world") return "World wonders can't be rushed";
	const cost = rushCost(building);
	if (sim.player(player).stars < cost) return `Needs ${cost} stars`;
	return null;
}

export function rushCommand (sim: Sim, player: number, buildingId: number): CommandResult {
	const building = sim.building(buildingId);
	const problem = rushProblem(sim, player, building);
	if (problem || !building) return fail(problem ?? "Not your building");
	const cost = rushCost(building);
	sim.player(player).stars -= cost;
	building.needs = {};
	sim.emit({ type: "stars", player, amount: -cost, reason: `Rushed ${BUILDINGS[building.type].name}` });
	completeBuilding(sim, building);
	return ok();
}

/** Stars for buying goods at a market. */
export function buyCost (good: Good, count: number): number {
	return Math.ceil(Math.max(1, GOOD_INFO[good].price * BUY_PRICE) * count);
}

/** Why goods can't be bought at this market now, or null. */
export function buyProblem (sim: Sim, player: number, buildingId: number, good: Good, count: number): string | null {
	const market = sim.building(buildingId);
	if (!market || market.owner !== player || market.type !== "market") return "Not your market";
	if (!market.built) return "The market isn't finished";
	if (!GOOD_INFO[good] || good === "coins") return "Coins can't be bought";
	if (!(count >= 1 && count <= 20) || Math.floor(count) !== count) return "Buy 1 to 20 at a time";
	if (sim.player(player).sell.includes(good)) return "You are selling that good";
	const cost = buyCost(good, count);
	if (sim.player(player).stars < cost) return `Needs ${cost} stars`;
	return null;
}

/**
 * Buy goods at a market: they wait at the market and carriers take them where
 * they are wanted (construction sites, workshops, cities) or to a store.
 */
export function buyCommand (sim: Sim, player: number, buildingId: number, good: Good, count: number): CommandResult {
	const problem = buyProblem(sim, player, buildingId, good, count);
	if (problem) return fail(problem);
	const market = sim.building(buildingId)!;
	const cost = buyCost(good, count);
	sim.player(player).stars -= cost;
	market.output[good] = (market.output[good] ?? 0) + count;
	sim.emit({ type: "stars", player, amount: -cost, reason: `Bought ${count} ${GOOD_INFO[good].name.toLowerCase()}` });
	sim.emit({ type: "buildingPlaced", building: market.id });
	return ok();
}

export function demolishCommand (sim: Sim, player: number, buildingId: number): CommandResult {
	const building = sim.building(buildingId);
	if (!building || building.owner !== player) return fail("Not your building");
	sim.removeBuilding(building);
	return ok();
}

function completeBuilding (sim: Sim, building: BuildingState): void {
	building.built = true;
	building.status = "";
	if (building.type === "walls") {
		const city = sim.cityOn(building.tile);
		if (city) {
			city.walls = true;
			sim.emit({ type: "cityChanged", city: city.id });
		}
	}
	sim.emit({ type: "buildingCompleted", building: building.id });
	if (BUILDINGS[building.type].wonder) wonderCompleted(sim, building);
}

// ------------------------------------------------------------------
// Roads
// ------------------------------------------------------------------

export function roadProblem (sim: Sim, player: number, tile: number): string | null {
	if (!sim.isPassableLand(tile)) return "Roads need passable land";
	if (sim.roads[tile] >= 0) return "There is already a road";
	if (sim.cityAt[tile] >= 0) return "Cities already connect roads";
	const owner = sim.map.owner[tile];
	if (owner >= 0 && owner !== player) return "Inside another civ's territory";
	if (owner !== player && !sim.neighbors(tile).some((n) => sim.map.owner[n] === player || sim.roads[n] === player)) return "Must be in or next to your territory or roads";
	if (sim.player(player).stars < ROAD_COST) return `Needs ${ROAD_COST} star`;
	return null;
}

export function roadCommand (sim: Sim, player: number, tile: number): CommandResult {
	const problem = roadProblem(sim, player, tile);
	if (problem) return fail(problem);
	sim.player(player).stars -= ROAD_COST;
	sim.roads[tile] = player;
	sim.emit({ type: "road", tile, owner: player });
	return ok();
}

/** Units at war can destroy an enemy road or building on their tile. */
export function pillageCommand (sim: Sim, player: number, unitId: number): CommandResult {
	const unit = sim.unit(unitId);
	if (!unit || unit.owner !== player) return fail("Not your unit");
	if (unit.attacked || unit.moves <= 0) return fail("No moves left");
	const tile = unit.tile;
	const building = sim.buildingOn(tile);
	if (building && building.owner !== player && sim.atWar(player, building.owner)) {
		sim.removeBuilding(building);
	} else if (sim.roads[tile] >= 0 && sim.roads[tile] !== player && sim.atWar(player, sim.roads[tile])) {
		sim.roads[tile] = -1;
		sim.emit({ type: "road", tile, owner: -1 });
	} else {
		return fail("Nothing of the enemy's to pillage here");
	}
	unit.moves = 0;
	unit.attacked = true;
	unit.acted = true;
	return ok();
}

export function sellCommand (sim: Sim, player: number, good: Good, on: boolean): CommandResult {
	const p = sim.player(player);
	p.sell = p.sell.filter((g) => g !== good);
	if (on) p.sell.push(good);
	return ok();
}

export function priorityCommand (sim: Sim, player: number, order: Priority[]): CommandResult {
	const valid: Priority[] = ["construction", "production", "food"];
	if (order.length !== 3 || !valid.every((v) => order.includes(v))) return fail("Invalid priority order");
	sim.player(player).priority = [...order];
	return ok();
}

// ------------------------------------------------------------------
// The economy phase
// ------------------------------------------------------------------

interface Request {
	kind: Priority | "market";
	tile: number;
	good: Good | "food";
	count: number;
	destKind: "building" | "city";
	dest: number;
	purpose: CargoPurpose;
}

export function carrierSpeed (sim: Sim, player: number): number {
	const p = sim.player(player);
	return CARRIER_SPEED + (p.civ === "riverfolk" ? 2 : 0) + (p.techs.includes("logistics") ? 2 : 0) + roadBonus(sim, player).speed;
}

export function roadCapacity (sim: Sim, player: number): number {
	return ROAD_CAPACITY * (sim.player(player).techs.includes("logistics") ? 2 : 1) + roadBonus(sim, player).capacity;
}

/** Is a building working (finished and within its city's slot cap)? */
export function isActive (sim: Sim, building: BuildingState): boolean {
	if (!building.built) return false;
	if (!BUILDINGS[building.type].slot) return true;
	const city = sim.city(building.city);
	if (!city) return false;
	let index = 0;
	for (const b of sim.state.buildings) {
		if (b.city !== city.id || !BUILDINGS[b.type].slot) continue;
		if (b === building) return index < slotCap(city);
		index++;
	}
	return false;
}

/** What a production building makes per cycle, with civ perks. */
export function outputsOf (sim: Sim, building: BuildingState): Goods {
	const info = BUILDINGS[building.type];
	const civ = sim.player(building.owner).civ;
	if (building.type === "mine") {
		const good = DEPOSIT_GOOD[sim.map.deposit[building.tile] as Deposit];
		return good ? { [good]: civ === "highlanders" ? 2 : 1 } : {};
	}
	const out: Goods = { ...info.outputs };
	const double = (building.type === "farm" && civ === "plainsfolk") || (building.type === "sawmill" && civ === "woodlanders");
	if (double) for (const g of Object.keys(out) as Good[]) out[g] = out[g]! * 2;
	return out;
}

export function economyPhase (sim: Sim, player: number, lines: string[]): void {
	const p = sim.player(player);
	const nodes = networkNodes(sim, player);
	const s = search(sim);
	const mine = sim.buildingsOf(player);
	const markets = marketFactor(sim, player);
	let produced = 0;

	// 1. Production
	for (const b of mine) {
		const info = BUILDINGS[b.type];
		if (!b.built) {
			b.status = "Waiting for materials";
			continue;
		}
		if (!isActive(sim, b)) {
			b.status = "No free building slot in its city";
			continue;
		}
		const outputs = outputsOf(sim, b);
		const goods = Object.keys(outputs) as Good[];
		if (!goods.length) {
			b.status = "";
			continue;
		}
		if (goods.some((g) => (b.output[g] ?? 0) >= BUFFER_SIZE)) {
			b.status = nodes[b.tile] && hasNeighbourNode(sim, nodes, b.tile) ? "Output waiting for carriers" : "Not connected by road";
			continue;
		}
		const inputs = Object.entries(info.inputs) as [Good, number][];
		if (inputs.some(([g, n]) => (b.input[g] ?? 0) < n)) {
			b.status = "Waiting for " + inputs.filter(([g, n]) => (b.input[g] ?? 0) < n).map(([g]) => GOOD_INFO[g].name.toLowerCase()).join(" and ");
			continue;
		}
		for (const [g, n] of inputs) b.input[g] = (b.input[g] ?? 0) - n;
		for (const g of goods) {
			b.output[g] = (b.output[g] ?? 0) + outputs[g]!;
			produced += outputs[g]!;
		}
		b.status = "";
	}
	p.stats.produced += produced;

	// 2. Requests, served by the nearest source in priority order
	const incoming = new Map<string, number>();
	for (const c of sim.state.cargo) {
		if (c.owner !== player) continue;
		const key = `${c.destKind}:${c.dest}:${isFood(c.good) && c.purpose === "food" ? "food" : c.good}`;
		incoming.set(key, (incoming.get(key) ?? 0) + 1);
	}
	const inFlight = (destKind: string, dest: number, good: string) => incoming.get(`${destKind}:${dest}:${good}`) ?? 0;

	const requests: Request[] = [];
	for (const b of mine) {
		if (!b.built) {
			for (const [g, n] of Object.entries(b.needs) as [Good, number][]) {
				const want = n - inFlight("building", b.id, g);
				if (want > 0) requests.push({ kind: "construction", tile: b.tile, good: g, count: want, destKind: "building", dest: b.id, purpose: "construction" });
			}
		} else if (isActive(sim, b)) {
			for (const g of Object.keys(BUILDINGS[b.type].inputs) as Good[]) {
				const want = BUFFER_SIZE - (b.input[g] ?? 0) - inFlight("building", b.id, g);
				if (want > 0) requests.push({ kind: "production", tile: b.tile, good: g, count: want, destKind: "building", dest: b.id, purpose: "input" });
			}
			if (b.type === "market") {
				for (const g of p.sell) {
					const want = 2 - inFlight("building", b.id, g);
					if (want > 0) requests.push({ kind: "market", tile: b.tile, good: g, count: want, destKind: "building", dest: b.id, purpose: "market" });
				}
			}
		}
	}
	let ate = 0;
	for (const city of sim.citiesOf(player)) {
		// Food already in the city's own store is eaten straight away
		for (const g of ["bread", "fish", "game"] as Good[]) {
			while ((city.store[g] ?? 0) > 0) {
				city.store[g]! -= 1;
				if (!city.store[g]) delete city.store[g];
				addGrowth(sim, city, foodValue(sim, player, g));
				ate++;
			}
		}
		const want = 2 - inFlight("city", city.id, "food");
		if (want > 0) requests.push({ kind: "food", tile: city.tile, good: "food", count: want, destKind: "city", dest: city.id, purpose: "food" });
	}

	const rank = (r: Request) => (r.kind === "market" ? 3 : p.priority.indexOf(r.kind));
	requests.sort((a, b) => rank(a) - rank(b) || a.dest - b.dest);

	const newCargo: CargoState[] = [];
	for (const req of requests) {
		for (let k = 0; k < req.count; k++) {
			const order = s.run(sim, nodes, req.tile);
			let found = false;
			for (const t of order) {
				if (t === req.tile) continue;
				const take = takeFromSource(sim, player, t, req.good);
				if (!take) continue;
				const path = s.pathTo(t).reverse();
				newCargo.push(makeCargo(sim, player, take, path, req.destKind, req.dest, req.purpose));
				found = true;
				break;
			}
			if (!found) break;
		}
	}

	// 3. Unrequested output goes to the nearest store, or to a market if it's for sale
	for (const b of mine) {
		for (const [g, n] of Object.entries(b.output) as [Good, number][]) {
			for (let k = 0; k < n; k++) {
				const order = s.run(sim, nodes, b.tile);
				let dest: { kind: "building" | "city"; id: number; tile: number; purpose: CargoPurpose } | null = null;
				for (const t of order) {
					if (t === b.tile) continue;
					const target = sim.buildingOn(t);
					if (target && target.owner === player && target.built && target.type === "market" && p.sell.includes(g)) {
						dest = { kind: "building", id: target.id, tile: t, purpose: "market" };
						break;
					}
					if (target && target.owner === player && target.built && target.type === "warehouse") {
						dest = { kind: "building", id: target.id, tile: t, purpose: "store" };
						break;
					}
					const city = sim.cityOn(t);
					if (city && city.owner === player) {
						dest = { kind: "city", id: city.id, tile: t, purpose: isFood(g) ? "food" : "store" };
						break;
					}
				}
				if (!dest) break;
				b.output[g]! -= 1;
				if (!b.output[g]) delete b.output[g];
				newCargo.push(makeCargo(sim, player, g, s.pathTo(dest.tile), dest.kind, dest.id, dest.purpose));
			}
		}
	}
	for (const c of newCargo) sim.state.cargo.push(c);

	// 4. Transport
	const speed = carrierSpeed(sim, player);
	const capacity = roadCapacity(sim, player);
	const usage = new Map<number, number>();
	const blocked = (t: number) => {
		const u = sim.unitOn(t);
		return !!u && sim.atWar(player, u.owner);
	};
	// Trade cargo travels over the giver's and the receiver's networks
	const shared = new Map<number, Uint8Array>();
	const tradeNodes = (receiver: number) => {
		let both = shared.get(receiver);
		if (!both) {
			const theirs = networkNodes(sim, receiver);
			both = new Uint8Array(sim.map.count);
			for (let t = 0; t < both.length; t++) both[t] = Math.max(nodes[t], theirs[t]);
			shared.set(receiver, both);
		}
		return both;
	};
	const lost: CargoState[] = [];
	let delivered = 0, sold = 0, stuck = 0;
	const arrived: CargoState[] = [];
	for (const cargo of sim.state.cargo) {
		if (cargo.owner !== player) continue;
		const trade = cargo.receiver;
		if (trade !== undefined && (!sim.state.players[trade]?.alive || sim.atWar(player, trade))) {
			lost.push(cargo);
			continue;
		}
		const net = trade !== undefined ? tradeNodes(trade) : nodes;
		const moved = [cargo.path[cargo.at]];
		let steps = speed;
		while (steps > 0 && cargo.at < cargo.path.length - 1) {
			const next = cargo.path[cargo.at + 1];
			if (!net[next] || blocked(next)) {
				// The road was cut or blocked: look for another way
				const dest = cargo.path[cargo.path.length - 1];
				s.run(sim, net, cargo.path[cargo.at], 80, blocked);
				const detour = s.pathTo(dest);
				if (detour.length < 2) break;
				cargo.path = detour;
				cargo.at = 0;
				continue;
			}
			// Roads take only so many loads a turn; the sea doesn't jam
			if (!sim.map.isWater(next)) {
				const used = usage.get(next) ?? 0;
				if (used >= capacity) break;
				usage.set(next, used + 1);
			}
			cargo.at++;
			steps--;
			moved.push(next);
		}
		const done = cargo.at >= cargo.path.length - 1;
		if (!done && moved.length === 1) stuck++;
		if (moved.length > 1 || done) {
			sim.emit({ type: "cargoMoved", cargo: cargo.id, owner: player, good: cargo.good, path: moved, delivered: done, receiver: trade });
		}
		if (done) arrived.push(cargo);
	}
	for (const cargo of lost) sim.removeCargo(cargo);

	// 5. Deliveries
	for (const cargo of arrived) {
		sim.removeCargo(cargo);
		delivered++;
		p.stats.delivered++;
		if (cargo.purpose === "trade" && cargo.receiver !== undefined) {
			// Goods for another civ: into the city it was sent to, or their capital if that city changed hands
			const receiver = cargo.receiver;
			let city = sim.city(cargo.dest);
			if (!city || city.owner !== receiver) city = sim.citiesOf(receiver).find((c) => c.capital) ?? sim.citiesOf(receiver)[0];
			if (city) {
				addTo(city.store, cargo.good, 1);
				sim.emit({ type: "cityChanged", city: city.id });
			}
			continue;
		}
		if (cargo.destKind === "city") {
			const city = sim.city(cargo.dest);
			if (!city || city.owner !== player) continue;
			if (cargo.purpose === "food" && isFood(cargo.good)) {
				addGrowth(sim, city, foodValue(sim, player, cargo.good));
				ate++;
			} else {
				addTo(city.store, cargo.good, 1);
			}
			continue;
		}
		const b = sim.building(cargo.dest);
		if (!b || b.owner !== player) continue;
		if (cargo.purpose === "construction" && !b.built && (b.needs[cargo.good] ?? 0) > 0) {
			b.needs[cargo.good]! -= 1;
			if (!b.needs[cargo.good]) delete b.needs[cargo.good];
		} else if (cargo.purpose === "input" && b.built) {
			addTo(b.input, cargo.good, 1);
		} else if (cargo.purpose === "market" && b.built) {
			const price = GOOD_INFO[cargo.good].price * markets;
			p.stars += price;
			sold += price;
		} else if (b.type === "warehouse" && b.built) {
			addTo(b.store, cargo.good, 1);
		} else {
			const city = sim.city(b.city);
			if (city && city.owner === player) addTo(city.store, cargo.good, 1);
		}
	}
	if (sold) sim.emit({ type: "stars", player, amount: sold, reason: "Market sales" });

	// 6. Finished construction
	const finished: string[] = [];
	for (const b of mine) {
		if (!b.built && total(b.needs) === 0 && sim.building(b.id)) {
			completeBuilding(sim, b);
			finished.push(BUILDINGS[b.type].name);
		}
	}

	const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
	if (produced) lines.push(`Produced ${n(produced, "good", "goods")}`);
	if (delivered) lines.push(`Carriers delivered ${n(delivered, "load", "loads")}`);
	if (ate) lines.push(`Cities ate ${ate} food`);
	if (sold) lines.push(`Markets sold goods for ${n(sold, "star", "stars")}`);
	if (finished.length) lines.push(`Finished: ${finished.join(", ")}`);
	if (stuck) lines.push(`${n(stuck, "load is", "loads are")} stuck (jammed or cut roads)`);
	const idle = mine.filter((b) => b.built && b.status && b.status !== "").length;
	if (idle) lines.push(`${n(idle, "building is", "buildings are")} idle`);
}

function hasNeighbourNode (sim: Sim, nodes: Uint8Array, tile: number): boolean {
	return sim.neighbors(tile).some((n) => nodes[n]);
}

/** Take one unit of a good (or any food) from a source tile, returning what was taken. */
function takeFromSource (sim: Sim, player: number, tile: number, good: Good | "food"): Good | null {
	const kinds: Good[] = good === "food" ? ["bread", "fish", "game"] : [good];
	const b = sim.buildingOn(tile);
	if (b && b.owner === player) {
		for (const k of kinds) {
			if ((b.output[k] ?? 0) > 0) return takeFrom(b.output, k);
			if (b.type === "warehouse" && (b.store[k] ?? 0) > 0) return takeFrom(b.store, k);
		}
	}
	const city = sim.cityOn(tile);
	if (city && city.owner === player) {
		for (const k of kinds) if ((city.store[k] ?? 0) > 0) return takeFrom(city.store, k);
	}
	return null;
}

function takeFrom (goods: Goods, good: Good): Good {
	goods[good]! -= 1;
	if (!goods[good]) delete goods[good];
	return good;
}

function addTo (goods: Goods, good: Good, n: number): void {
	goods[good] = (goods[good] ?? 0) + n;
}

function makeCargo (sim: Sim, player: number, good: Good, path: number[], destKind: "building" | "city", dest: number, purpose: CargoPurpose): CargoState {
	return { id: sim.nextId(), owner: player, good, path, at: 0, destKind, dest, purpose };
}

export function total (goods: Goods): number {
	let n = 0;
	for (const v of Object.values(goods)) n += v ?? 0;
	return n;
}

/** Everything a civ has in its city and warehouse stores. */
export function storedGoods (sim: Sim, player: number): Goods {
	const totals: Goods = {};
	const add = (goods: Goods) => {
		for (const [g, n] of Object.entries(goods) as [Good, number][]) totals[g] = (totals[g] ?? 0) + n;
	};
	for (const c of sim.citiesOf(player)) add(c.store);
	for (const b of sim.buildingsOf(player)) if (b.type === "warehouse") add(b.store);
	return totals;
}

export type { CityState };
