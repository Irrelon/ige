import { Feature, Relief, type Terrain, TERRAIN_INFO } from "../terrain";
import { cityConquered, villageTaken } from "./diplomacy";
import { trainsVeterans } from "./effects";
import { availableGoods, takeGoods } from "./network";
import { fail, ok } from "./result";
import { BUILDINGS, buildingSlots, foodGoodsOf, foodValueOf, type Good, growthNeeded, levelRewards, NEW_CITY_STORE, type RewardId, UNIT_TYPES, type UnitTypeId } from "./rules";
import type { Sim } from "./sim";
import type { CityState, CommandResult } from "./types";

/**
 * Cities: villages and founding, capture, territory, growth and levels,
 * rewards, building slots, training units and star income.
 */

export function createCity (sim: Sim, owner: number, tile: number, capital: boolean): CityState {
	const city: CityState = {
		id: sim.nextId(),
		owner,
		tile,
		name: sim.cityName(),
		level: 1,
		growth: 0,
		capital,
		founded: sim.state.turn,
		walls: false,
		bonusIncome: 0,
		pendingRewards: 0,
		radius: capital ? 2 : 1,
		store: owner >= 0 ? { ...NEW_CITY_STORE } : {}
	};
	sim.addCity(city);
	if (sim.map.feature[tile] !== Feature.None) {
		sim.map.feature[tile] = Feature.None;
		sim.emit({ type: "featureCleared", tile });
	}
	if (owner >= 0) claimTerritory(sim, city);
	return city;
}

/** Claim every unowned tile within the city's radius. */
export function claimTerritory (sim: Sim, city: CityState): void {
	if (city.owner < 0) return;
	const claimed: number[] = [];
	for (const t of sim.tilesWithin(city.tile, city.radius)) {
		if (sim.map.owner[t] >= 0) continue;
		sim.map.owner[t] = city.owner;
		sim.tileCity[t] = city.id;
		claimed.push(t);
	}
	if (claimed.length) sim.emit({ type: "territory", player: city.owner, tiles: claimed });
	sim.markFog(city.owner);
}

/** Whether a city may be founded on a tile ("Allow founding cities" must be on). */
export function foundProblem (sim: Sim, player: number, tile: number): string | null {
	if (!sim.options.allowFounding) return "Founding cities is turned off for this game";
	const map = sim.map;
	if (!TERRAIN_INFO[map.terrain[tile] as Terrain].settleable) return "Can't settle this terrain";
	const relief = map.relief[tile] as Relief;
	if (relief !== Relief.Flat && relief !== Relief.Hills) return "Can't settle this terrain";
	if (map.owner[tile] >= 0 && map.owner[tile] !== player) return "Inside another civ's territory";
	if (sim.state.cities.some((c) => sim.distance(c.tile, tile) < 3)) return "Too close to another city";
	return null;
}

export function foundCommand (sim: Sim, player: number, unitId: number): CommandResult {
	const unit = sim.unit(unitId);
	if (!unit || unit.owner !== player) return fail("Not your unit");
	if (!UNIT_TYPES[unit.type].founder) return fail("Only settlers can found cities");
	if (unit.moves <= 0 && unit.acted) return fail("No moves left");
	const problem = foundProblem(sim, player, unit.tile);
	if (problem) return fail(problem);
	const tile = unit.tile;
	sim.removeUnit(unit, "founded");
	const city = createCity(sim, player, tile, false);
	sim.emit({ type: "cityFounded", city: city.id });
	return ok();
}

/** Why the unit can't capture the city it stands on, or null if it can. */
export function captureProblem (sim: Sim, player: number, unitId: number): string | null {
	const unit = sim.unit(unitId);
	if (!unit || unit.owner !== player) return "Not your unit";
	const city = sim.cityOn(unit.tile);
	if (!city || city.owner === player) return "No city to capture here";
	if (city.owner >= 0 && !sim.atWar(player, city.owner)) return "You are not at war with them";
	if (unit.acted || unit.attacked) return "The unit must start its turn in the city to capture it";
	return null;
}

export function captureCommand (sim: Sim, player: number, unitId: number): CommandResult {
	const problem = captureProblem(sim, player, unitId);
	if (problem) return fail(problem);
	const unit = sim.unit(unitId)!;
	const city = sim.cityOn(unit.tile)!;
	const from = city.owner;
	transferCity(sim, city, player);
	unit.moves = 0;
	unit.acted = true;
	sim.player(player).stats.captured++;
	if (from >= 0) sim.player(player).stats.conquered++;
	return ok();
}

/** Hand a city (with its territory, buildings and roads) to a new owner. */
export function transferCity (sim: Sim, city: CityState, to: number): void {
	const from = city.owner;
	city.owner = to;
	city.pendingRewards = 0;
	if (from >= 0) {
		city.level = Math.max(1, city.level - 1);
		city.growth = 0;
		city.capital = false;
		const moved: number[] = [];
		for (let t = 0; t < sim.map.count; t++) {
			if (sim.tileCity[t] !== city.id) continue;
			sim.map.owner[t] = to;
			moved.push(t);
			if (sim.roads[t] === from) {
				sim.roads[t] = to;
				sim.emit({ type: "road", tile: t, owner: to });
			}
		}
		for (const b of sim.state.buildings) {
			if (b.city === city.id) {
				b.owner = to;
				sim.emit({ type: "buildingPlaced", building: b.id });
			}
		}
		sim.state.cargo = sim.state.cargo.filter((c) => !(c.owner === from && moved.includes(c.path[c.path.length - 1])));
		if (moved.length) sim.emit({ type: "territory", player: to, tiles: moved });
		sim.markFog(from);
		cityConquered(sim, from, to);
	} else {
		city.store = { ...NEW_CITY_STORE };
		claimTerritory(sim, city);
		villageTaken(sim, to, city.tile);
	}
	sim.emit({ type: "cityCaptured", city: city.id, from, to });
	sim.markFog(to);
	if (from >= 0 && sim.citiesOf(from).length === 0) sim.eliminate(from);
}

/** Add growth points; a city that fills its bar levels up and earns a reward choice. */
export function addGrowth (sim: Sim, city: CityState, points: number): void {
	city.growth += points;
	while (city.growth >= growthNeeded(city.level)) {
		city.growth -= growthNeeded(city.level);
		city.level++;
		city.pendingRewards++;
		sim.emit({ type: "cityLevel", city: city.id, level: city.level });
	}
	sim.emit({ type: "cityChanged", city: city.id });
}

/** Growth from delivering a food good to a city of this player. */
export function foodValue (sim: Sim, player: number, good: Good): number {
	return foodValueOf(sim.player(player).civ, good);
}

export function rewardCommand (sim: Sim, player: number, cityId: number, reward: RewardId): CommandResult {
	const city = sim.city(cityId);
	if (!city || city.owner !== player) return fail("Not your city");
	if (city.pendingRewards <= 0) return fail("No reward to choose");
	if (!levelRewards(city.level).includes(reward)) return fail("That reward isn't offered");
	city.pendingRewards--;
	switch (reward) {
		case "income": city.bonusIncome += 1; break;
		case "income2": city.bonusIncome += 2; break;
		case "warrior":
		case "swordsman": {
			const spot = sim.freeLandNear(city.tile, 2)[0];
			if (spot !== undefined) sim.createUnit(reward, player, spot);
			break;
		}
		case "borders":
			city.radius++;
			claimTerritory(sim, city);
			break;
		case "walls": city.walls = true; break;
		case "store":
			city.store.planks = (city.store.planks ?? 0) + 3;
			city.store.stone = (city.store.stone ?? 0) + 3;
			break;
	}
	sim.emit({ type: "cityChanged", city: city.id });
	return ok();
}

/** Buildings using a city's slots (construction sites included). */
export function slotsUsed (sim: Sim, city: CityState): number {
	let used = 0;
	for (const b of sim.state.buildings) if (b.city === city.id && BUILDINGS[b.type].slot) used++;
	return used;
}

export function slotCap (city: CityState): number {
	return buildingSlots(city.level);
}

/** Unit cost for a civ (perks applied). */
export function unitCost (sim: Sim, player: number, type: UnitTypeId): { stars: number; goods: Record<string, number> } {
	const info = UNIT_TYPES[type];
	const goods: Record<string, number> = { ...info.goods } as Record<string, number>;
	let stars = info.stars;
	if (type === "rider" && sim.player(player).civ === "horselords") {
		stars -= 1;
		delete goods.horses;
	}
	return { stars, goods };
}

/** Why the city can't train this unit now, or null if it can. */
export function trainProblem (sim: Sim, player: number, cityId: number, type: UnitTypeId): string | null {
	const city = sim.city(cityId);
	if (!city || city.owner !== player) return "Not your city";
	const info = UNIT_TYPES[type];
	if (info.founder && !sim.options.allowFounding) return "Founding cities is turned off";
	if (!sim.hasTech(player, info.tech)) return "Needs a technology";
	if (sim.unitAt[city.tile] >= 0) return "The city tile is occupied";
	const cost = unitCost(sim, player, type);
	if (sim.player(player).stars < cost.stars) return `Needs ${cost.stars} stars`;
	const have = availableGoods(sim, player, city.tile);
	for (const [good, amount] of Object.entries(cost.goods)) {
		const available = good === "food" ? foodGoodsOf(sim.player(player).civ).reduce((n, g) => n + (have[g] ?? 0), 0) : have[good as Good] ?? 0;
		if (available < amount) return `Needs ${amount} ${good} in connected stores`;
	}
	return null;
}

const info = (type: UnitTypeId) => UNIT_TYPES[type];

export function trainCommand (sim: Sim, player: number, cityId: number, type: UnitTypeId): CommandResult {
	const problem = trainProblem(sim, player, cityId, type);
	if (problem) return fail(problem);
	const city = sim.city(cityId)!;
	const cost = unitCost(sim, player, type);
	sim.player(player).stars -= cost.stars;
	takeGoods(sim, player, city.tile, cost.goods);
	const unit = sim.createUnit(type, player, city.tile);
	if (trainsVeterans(sim, player) && !info(type).founder) {
		unit.veteran = true;
		unit.maxHp += 5;
		unit.hp = unit.maxHp;
	}
	sim.emit({ type: "stars", player, amount: -cost.stars, reason: UNIT_TYPES[type].name });
	return ok();
}
