/**
 * Static game data: goods, buildings, units, technologies, civilisations and
 * city level rewards. Pure data, shared by the simulation, the AI and the UI.
 * Numbers are first-pass balance values (see DESIGN.md).
 */

// ------------------------------------------------------------------
// Goods
// ------------------------------------------------------------------

export const GOODS = [
	"logs", "stone", "ore", "coal", "gold", "grain", "fish", "game", "horses",
	"planks", "iron", "flour", "coins",
	"tools", "weapons", "bread"
] as const;

export type Good = (typeof GOODS)[number];
export type Goods = Partial<Record<Good, number>>;

export const GOOD_INFO: Record<Good, { name: string; tier: 1 | 2 | 3; color: string; price: number }> = {
	logs: { name: "Logs", tier: 1, color: "#8b5a2b", price: 0.5 },
	stone: { name: "Stone", tier: 1, color: "#9a9a9a", price: 0.5 },
	ore: { name: "Ore", tier: 1, color: "#a0522d", price: 0.5 },
	coal: { name: "Coal", tier: 1, color: "#2b2b2b", price: 0.5 },
	gold: { name: "Gold", tier: 1, color: "#e8c547", price: 1 },
	grain: { name: "Grain", tier: 1, color: "#e3cf74", price: 0.5 },
	fish: { name: "Fish", tier: 1, color: "#6fb7d8", price: 0.5 },
	game: { name: "Game", tier: 1, color: "#b5653a", price: 0.5 },
	horses: { name: "Horses", tier: 1, color: "#7a4a2a", price: 1 },
	planks: { name: "Planks", tier: 2, color: "#d2a36a", price: 1 },
	iron: { name: "Iron", tier: 2, color: "#7d8a96", price: 1 },
	flour: { name: "Flour", tier: 2, color: "#f2ead8", price: 1 },
	coins: { name: "Coins", tier: 2, color: "#f5d142", price: 3 },
	tools: { name: "Tools", tier: 3, color: "#5b6b7a", price: 2 },
	weapons: { name: "Weapons", tier: 3, color: "#b23a3a", price: 2 },
	bread: { name: "Bread", tier: 3, color: "#d99a4e", price: 1.5 }
};

/** Growth points a city gains when a food good is delivered. */
export const FOOD_VALUE: Goods = { fish: 1, game: 1, bread: 2 };

export function isFood (good: Good): boolean {
	return (FOOD_VALUE[good] ?? 0) > 0;
}

// ------------------------------------------------------------------
// Map deposits
// ------------------------------------------------------------------

export enum Deposit {
	None = 0,
	Fish = 1,
	Game = 2,
	Ore = 3,
	Coal = 4,
	Gold = 5,
	Horses = 6
}

export const DEPOSIT_GOOD: Record<Deposit, Good | null> = {
	[Deposit.None]: null,
	[Deposit.Fish]: "fish",
	[Deposit.Game]: "game",
	[Deposit.Ore]: "ore",
	[Deposit.Coal]: "coal",
	[Deposit.Gold]: "gold",
	[Deposit.Horses]: "horses"
};

export const DEPOSIT_NAMES: Record<Deposit, string> = {
	[Deposit.None]: "",
	[Deposit.Fish]: "Fish",
	[Deposit.Game]: "Game",
	[Deposit.Ore]: "Ore",
	[Deposit.Coal]: "Coal",
	[Deposit.Gold]: "Gold",
	[Deposit.Horses]: "Horses"
};

// ------------------------------------------------------------------
// Buildings
// ------------------------------------------------------------------

/**
 * Where a building may stand (always a land tile in the owner's territory,
 * without another building, city or unit of another civ):
 * - forest: wooded tile          - forestGame: wooded tile with game
 * - quarry: hills, or next to a mountain
 * - mine: hills with an ore, coal or gold deposit
 * - farmland: flat grassland or plains
 * - coastFish: land next to water with fish     - coast: land next to water
 * - pasture: flat land with horses
 * - land: any flat or hills land tile
 * - city: the city's own tile
 *
 * Materials follow the chain so it can always restart: woodcutters cost only
 * stars, extractors and sawmills are built from logs, and workshops from
 * planks and stone.
 */
export type BuildingSite = "forest" | "forestGame" | "quarry" | "mine" | "farmland" | "coastFish" | "coast" | "pasture" | "land" | "city";

export type BuildingId =
	| "woodcutter" | "quarry" | "mine" | "farm" | "fishery" | "hunter" | "pasture"
	| "sawmill" | "smelter" | "mill" | "mint"
	| "toolsmith" | "armoury" | "bakery"
	| "warehouse" | "market" | "port" | "walls"
	| WonderId | MonumentId;

/** World wonders: one of each in the world, raced for. */
export type WonderId =
	| "greatLibrary" | "greatWall" | "colossus" | "hangingGardens" | "grandBazaar"
	| "imperialRoad" | "hallOfHeroes" | "observatory" | "councilHall" | "grandExchange";

/** Monuments: every civ may build each one, once it has earned it with a feat. */
export type MonumentId =
	| "victoryArch" | "grandFountain" | "sageTower" | "gildedVault"
	| "pathfinderCairn" | "marketCross" | "artisansColumn" | "peaceGarden";

export interface BuildingType {
	id: BuildingId;
	name: string;
	tech: TechId | null;
	site: BuildingSite;
	/** Consumed per production cycle. */
	inputs: Goods;
	/** Produced per cycle. Mines produce their deposit's good (output left empty). */
	outputs: Goods;
	/** Stars to place, plus materials that must be delivered to finish it. */
	stars: number;
	materials: Goods;
	/** Uses one of the city's building slots. */
	slot: boolean;
	/** Short letter/icon shown on the placeholder model. */
	icon: string;
	description: string;
	/** World wonder or monument. */
	wonder?: "world" | "monument";
	/** Monuments: the feat that earns the right to build it. */
	feat?: string;
}

/** Stars to place a monument (plus 1 per city the civ holds; world wonders add 2 per city). */
export const MONUMENT_STARS = 10;
/** Score for each world wonder and monument (the Grand Exchange is worth more). */
export const WONDER_SCORE = 40;
export const MONUMENT_SCORE = 20;

export const BUILDINGS: Record<BuildingId, BuildingType> = {
	woodcutter: { id: "woodcutter", name: "Woodcutter", tech: "forestry", site: "forest", inputs: {}, outputs: { logs: 1 }, stars: 2, materials: {}, slot: true, icon: "W", description: "Cuts logs in a forest." },
	quarry: { id: "quarry", name: "Quarry", tech: "mining", site: "quarry", inputs: {}, outputs: { stone: 1 }, stars: 2, materials: { logs: 1 }, slot: true, icon: "Q", description: "Cuts stone from hills or beside mountains." },
	mine: { id: "mine", name: "Mine", tech: "mining", site: "mine", inputs: {}, outputs: {}, stars: 3, materials: { logs: 2 }, slot: true, icon: "M", description: "Digs ore, coal or gold from a deposit in the hills." },
	farm: { id: "farm", name: "Farm", tech: "farming", site: "farmland", inputs: {}, outputs: { grain: 1 }, stars: 2, materials: { logs: 1 }, slot: true, icon: "F", description: "Grows grain on flat grassland or plains." },
	fishery: { id: "fishery", name: "Fishery", tech: "fishing", site: "coastFish", inputs: {}, outputs: { fish: 1 }, stars: 2, materials: { logs: 1 }, slot: true, icon: "~", description: "Catches fish from nearby waters." },
	hunter: { id: "hunter", name: "Hunter's Lodge", tech: "hunting", site: "forestGame", inputs: {}, outputs: { game: 1 }, stars: 2, materials: { logs: 1 }, slot: true, icon: "H", description: "Hunts game in the forest." },
	pasture: { id: "pasture", name: "Pasture", tech: "riding", site: "pasture", inputs: {}, outputs: { horses: 1 }, stars: 3, materials: { logs: 1 }, slot: true, icon: "P", description: "Breeds horses." },
	sawmill: { id: "sawmill", name: "Sawmill", tech: "sawmills", site: "land", inputs: { logs: 1 }, outputs: { planks: 1 }, stars: 3, materials: { logs: 2 }, slot: true, icon: "S", description: "Saws logs into planks." },
	smelter: { id: "smelter", name: "Smelter", tech: "smelting", site: "land", inputs: { ore: 1, coal: 1 }, outputs: { iron: 1 }, stars: 4, materials: { planks: 2, stone: 2 }, slot: true, icon: "I", description: "Smelts ore with coal into iron." },
	mill: { id: "mill", name: "Mill", tech: "milling", site: "land", inputs: { grain: 1 }, outputs: { flour: 1 }, stars: 3, materials: { planks: 2, stone: 1 }, slot: true, icon: "m", description: "Grinds grain into flour." },
	mint: { id: "mint", name: "Mint", tech: "coinage", site: "land", inputs: { gold: 1, coal: 1 }, outputs: { coins: 1 }, stars: 5, materials: { planks: 2, stone: 3 }, slot: true, icon: "$", description: "Strikes coins from gold; coins sell for stars." },
	toolsmith: { id: "toolsmith", name: "Toolsmith", tech: "carpentry", site: "land", inputs: { iron: 1, planks: 1 }, outputs: { tools: 1 }, stars: 4, materials: { planks: 2, stone: 2 }, slot: true, icon: "T", description: "Makes tools from iron and planks." },
	armoury: { id: "armoury", name: "Armoury", tech: "smithing", site: "land", inputs: { iron: 1, coal: 1 }, outputs: { weapons: 1 }, stars: 4, materials: { planks: 2, stone: 2, tools: 1 }, slot: true, icon: "A", description: "Forges weapons for swordsmen." },
	bakery: { id: "bakery", name: "Bakery", tech: "baking", site: "land", inputs: { flour: 1 }, outputs: { bread: 1 }, stars: 3, materials: { planks: 2, stone: 1 }, slot: true, icon: "B", description: "Bakes bread, the best food for growing cities." },
	warehouse: { id: "warehouse", name: "Warehouse", tech: "trade", site: "land", inputs: {}, outputs: {}, stars: 3, materials: { planks: 2, stone: 2 }, slot: true, icon: "W", description: "Stores goods near where they are made and used." },
	market: { id: "market", name: "Market", tech: "trade", site: "land", inputs: {}, outputs: {}, stars: 4, materials: { planks: 3, stone: 2 }, slot: true, icon: "$", description: "Sells goods you mark for sale for stars." },
	port: { id: "port", name: "Port", tech: "sailing", site: "coast", inputs: {}, outputs: {}, stars: 4, materials: { planks: 3, stone: 1 }, slot: true, icon: "P", description: "Ships goods by sea: carriers sail between your ports, so cities across the water share one network." },
	walls: { id: "walls", name: "City Walls", tech: "masonry", site: "city", inputs: {}, outputs: {}, stars: 4, materials: { stone: 4 }, slot: false, icon: "#", description: "Quadruples the defence of units in the city." },
	...wonders({
		greatLibrary: ["Great Library", "trade", 15, { planks: 8, stone: 6 }, "Research costs 25% less."],
		greatWall: ["Great Wall", "masonry", 15, { stone: 14, logs: 6 }, "Your cities without walls defend at x2.5 (walls x4)."],
		colossus: ["Colossus", "sailing", 15, { planks: 6, stone: 6, logs: 6 }, "+1 star a turn for each of your coastal cities."],
		hangingGardens: ["Hanging Gardens", "baking", 20, { planks: 6, stone: 6, bread: 6 }, "+1 growth a turn in every one of your cities."],
		grandBazaar: ["Grand Bazaar", "coinage", 20, { planks: 6, stone: 6, coins: 4 }, "Markets earn 50% more and each trade agreement 1 star more."],
		imperialRoad: ["Imperial Road", "logistics", 20, { stone: 12, planks: 4, horses: 4 }, "Carriers move 2 tiles further and roads carry 1 more load."],
		hallOfHeroes: ["Hall of Heroes", "smithing", 20, { stone: 8, planks: 4, weapons: 4 }, "Units you train start as veterans."],
		observatory: ["Great Observatory", "navigation", 20, { stone: 8, planks: 6, tools: 2 }, "+1 sight for your units and cities."],
		councilHall: ["Council Hall", "diplomacy", 25, { stone: 8, planks: 8, coins: 4 }, "+3 World Council votes; other civs warm to you."],
		grandExchange: ["Grand Exchange", "engineering", 25, { planks: 10, stone: 10, tools: 6, coins: 8 }, "A wonder of trade. Completing it wins a Prosperity victory."]
	}),
	...monuments({
		victoryArch: ["Victory Arch", "Win 10 battles"],
		grandFountain: ["Grand Fountain", "Grow a city to level 6"],
		sageTower: ["Sage's Tower", "Research 15 technologies"],
		gildedVault: ["Gilded Vault", "Hold 100 stars at the start of a turn"],
		pathfinderCairn: ["Pathfinder's Cairn", "Explore half of the world's land"],
		marketCross: ["Market Cross", "Link 5 cities to your capital by road"],
		artisansColumn: ["Artisans' Column", "Produce 300 goods"],
		peaceGarden: ["Garden of Peace", "Know 2 civs and stay at peace with everyone for 25 turns"]
	})
};

function wonders (list: Record<WonderId, [string, TechId, number, Goods, string]>): Record<WonderId, BuildingType> {
	const out = {} as Record<WonderId, BuildingType>;
	for (const [id, [name, tech, stars, materials, description]] of Object.entries(list) as [WonderId, [string, TechId, number, Goods, string]][]) {
		out[id] = { id, name, tech, site: "land", inputs: {}, outputs: {}, stars, materials, slot: false, icon: "*", description, wonder: "world" };
	}
	return out;
}

function monuments (list: Record<MonumentId, [string, string]>): Record<MonumentId, BuildingType> {
	const out = {} as Record<MonumentId, BuildingType>;
	for (const [id, [name, feat]] of Object.entries(list) as [MonumentId, [string, string]][]) {
		out[id] = {
			id, name, tech: null, site: "land", inputs: {}, outputs: {}, stars: MONUMENT_STARS, materials: { stone: 4, planks: 2 }, slot: false, icon: "^",
			description: `A monument: raises its city a level and adds score. Earned by: ${feat.toLowerCase()}.`, wonder: "monument", feat
		};
	}
	return out;
}



export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];
export const WONDER_IDS = BUILDING_IDS.filter((b) => BUILDINGS[b].wonder === "world") as WonderId[];
export const MONUMENT_IDS = BUILDING_IDS.filter((b) => BUILDINGS[b].wonder === "monument") as MonumentId[];

/** Input and output slot sizes of a production building. */
export const BUFFER_SIZE = 2;

/** Markets also sell goods to their own civ, at this many times the market price (at least 1 star a good). */
export const BUY_PRICE = 2;

/** Rushing a construction site costs this many times each missing good's market price (at least 2 stars a good). Wonders can't be rushed. */
export const RUSH_PRICE = 4;

/** Goods a newly founded city, or a captured village, starts its store with. */
export const NEW_CITY_STORE: Goods = { logs: 3 };

/** Stars per road tile. */
export const ROAD_COST = 1;

// ------------------------------------------------------------------
// Units
// ------------------------------------------------------------------

export type UnitTypeId = "warrior" | "archer" | "rider" | "swordsman" | "catapult" | "settler";

export interface UnitType {
	id: UnitTypeId;
	name: string;
	shape: string;
	tech: TechId | null;
	hp: number;
	attack: number;
	defence: number;
	moves: number;
	range: number;
	stars: number;
	/** Stars a turn to keep (beyond the civ's free allowance). */
	upkeep: number;
	/** Goods taken from the training city's connected stores. "food" means any food good. */
	goods: Goods & { food?: number };
	/** Only trainable when founding cities is allowed. */
	founder?: boolean;
	description: string;
}

export const UNIT_TYPES: Record<UnitTypeId, UnitType> = {
	warrior: { id: "warrior", name: "Warrior", shape: "Cube", tech: null, hp: 10, attack: 2, defence: 2, moves: 2, range: 1, stars: 2, upkeep: 1, goods: {}, description: "Basic melee unit." },
	archer: { id: "archer", name: "Archer", shape: "Pyramid", tech: "archery", hp: 10, attack: 2, defence: 1, moves: 2, range: 2, stars: 3, upkeep: 1, goods: {}, description: "Attacks from 2 tiles away; needs line of sight." },
	rider: { id: "rider", name: "Rider", shape: "Cube on orb", tech: "riding", hp: 10, attack: 2, defence: 1, moves: 3, range: 1, stars: 3, upkeep: 1, goods: { horses: 1 }, description: "Fast unit. Needs a horse." },
	swordsman: { id: "swordsman", name: "Swordsman", shape: "Tall cube", tech: "smithing", hp: 15, attack: 3, defence: 3, moves: 2, range: 1, stars: 5, upkeep: 1, goods: { weapons: 1 }, description: "Strong melee unit. Needs weapons." },
	catapult: { id: "catapult", name: "Catapult", shape: "Wide pyramid", tech: "siege", hp: 10, attack: 4, defence: 0, moves: 1, range: 3, stars: 8, upkeep: 2, goods: { planks: 1, iron: 1 }, description: "Siege engine with range 3. Needs planks and iron." },
	settler: { id: "settler", name: "Settler", shape: "Orb", tech: null, hp: 6, attack: 0, defence: 1, moves: 2, range: 1, stars: 5, upkeep: 1, goods: { food: 2 }, founder: true, description: "Founds a new city. Needs 2 food." }
};

/**
 * Running a big empire: the first 10 cities cost nothing, the next 10 cost 1
 * star a turn each, the next 10 cost 2, and so on, so very wide civs pay
 * their way.
 */
export const ADMIN_STEP = 10;
export function administration (cities: number): number {
	let stars = 0;
	for (let k = 0; k < cities; k++) stars += Math.floor(k / ADMIN_STEP);
	return stars;
}

/** Upkeep doubles once a civ knows this many technologies (modern armies cost more to keep). */
export const MODERN_TECHS = 12;

/** Units every civ keeps without upkeep: a base plus one per city. */
export const FREE_UNITS = 3;
export const FREE_UNITS_PER_CITY = 1;

export const UNIT_TYPE_IDS = Object.keys(UNIT_TYPES) as UnitTypeId[];

/** Kills needed to become a veteran (+5 max health, fully healed). */
export const VETERAN_KILLS = 3;

// ------------------------------------------------------------------
// Technologies
// ------------------------------------------------------------------

export type TechId =
	| "forestry" | "mining" | "farming" | "hunting" | "fishing" | "archery" | "riding"
	| "sawmills" | "smelting" | "milling" | "sailing" | "trade" | "masonry"
	| "carpentry" | "smithing" | "baking" | "navigation" | "coinage" | "logistics"
	| "siege" | "diplomacy" | "engineering";

export interface Tech {
	id: TechId;
	name: string;
	tier: number;
	requires: TechId[];
	branch: "Industry" | "Food" | "Sea" | "Society" | "War";
	unlocks: string;
}

export const TECHS: Record<TechId, Tech> = {
	forestry: { id: "forestry", name: "Forestry", tier: 1, requires: [], branch: "Industry", unlocks: "Woodcutter" },
	mining: { id: "mining", name: "Mining", tier: 1, requires: [], branch: "Industry", unlocks: "Quarry, Mine" },
	farming: { id: "farming", name: "Farming", tier: 1, requires: [], branch: "Food", unlocks: "Farm" },
	hunting: { id: "hunting", name: "Hunting", tier: 1, requires: [], branch: "Food", unlocks: "Hunter's Lodge" },
	fishing: { id: "fishing", name: "Fishing", tier: 1, requires: [], branch: "Sea", unlocks: "Fishery" },
	archery: { id: "archery", name: "Archery", tier: 1, requires: [], branch: "War", unlocks: "Archer" },
	riding: { id: "riding", name: "Riding", tier: 1, requires: [], branch: "Food", unlocks: "Pasture, Rider" },
	sawmills: { id: "sawmills", name: "Sawmills", tier: 2, requires: ["forestry"], branch: "Industry", unlocks: "Sawmill" },
	smelting: { id: "smelting", name: "Smelting", tier: 2, requires: ["mining"], branch: "Industry", unlocks: "Smelter" },
	milling: { id: "milling", name: "Milling", tier: 2, requires: ["farming"], branch: "Food", unlocks: "Mill" },
	sailing: { id: "sailing", name: "Sailing", tier: 2, requires: ["fishing"], branch: "Sea", unlocks: "Port; units can embark onto coastal water" },
	trade: { id: "trade", name: "Trade", tier: 2, requires: [], branch: "Society", unlocks: "Warehouse, Market, trade agreements" },
	masonry: { id: "masonry", name: "Masonry", tier: 2, requires: ["mining"], branch: "War", unlocks: "City Walls" },
	carpentry: { id: "carpentry", name: "Carpentry", tier: 3, requires: ["sawmills", "smelting"], branch: "Industry", unlocks: "Toolsmith" },
	smithing: { id: "smithing", name: "Smithing", tier: 3, requires: ["smelting"], branch: "War", unlocks: "Armoury, Swordsman" },
	baking: { id: "baking", name: "Baking", tier: 3, requires: ["milling"], branch: "Food", unlocks: "Bakery" },
	navigation: { id: "navigation", name: "Navigation", tier: 3, requires: ["sailing"], branch: "Sea", unlocks: "Units and ships can cross deep ocean" },
	coinage: { id: "coinage", name: "Coinage", tier: 3, requires: ["trade", "mining"], branch: "Society", unlocks: "Mint" },
	logistics: { id: "logistics", name: "Logistics", tier: 3, requires: ["trade", "riding"], branch: "Society", unlocks: "Pack animals: carriers move further and roads carry twice as much" },
	siege: { id: "siege", name: "Siege", tier: 4, requires: ["smithing", "carpentry"], branch: "War", unlocks: "Catapult" },
	diplomacy: { id: "diplomacy", name: "Diplomacy", tier: 4, requires: ["trade", "coinage"], branch: "Society", unlocks: "The World Council (diplomatic victory)" },
	engineering: { id: "engineering", name: "Engineering", tier: 4, requires: ["carpentry", "coinage"], branch: "Industry", unlocks: "Grand Exchange (prosperity victory)" }
};

export const TECH_IDS = Object.keys(TECHS) as TechId[];

/** Research cost in stars: rises with the tech's tier and the civ's number of cities. */
export function techCost (tech: TechId, cities: number): number {
	const tier = TECHS[tech].tier;
	return Math.round(4 + tier * 4 + Math.max(0, cities - 1) * tier * 1.5);
}

// ------------------------------------------------------------------
// Civilisations
// ------------------------------------------------------------------

export type CivId = "highlanders" | "riverfolk" | "woodlanders" | "horselords" | "coastfolk" | "plainsfolk";

export interface Civ {
	id: CivId;
	name: string;
	startTech: TechId;
	perk: string;
	/** AI research preference (first available is chosen). */
	research: TechId[];
}

export const CIVS: Record<CivId, Civ> = {
	highlanders: { id: "highlanders", name: "Highlanders", startTech: "mining", perk: "Mines produce double", research: ["forestry", "sawmills", "smelting", "archery", "masonry", "smithing", "hunting", "trade", "carpentry", "coinage", "siege", "farming", "milling", "baking", "engineering", "diplomacy"] },
	riverfolk: { id: "riverfolk", name: "River Folk", startTech: "trade", perk: "Carriers move 2 extra tiles per turn", research: ["forestry", "sawmills", "fishing", "farming", "milling", "mining", "coinage", "baking", "logistics", "smelting", "diplomacy", "carpentry", "engineering", "archery", "smithing"] },
	woodlanders: { id: "woodlanders", name: "Woodlanders", startTech: "forestry", perk: "Sawmills produce double", research: ["sawmills", "hunting", "mining", "archery", "farming", "smelting", "carpentry", "trade", "milling", "baking", "masonry", "smithing", "coinage", "engineering"] },
	horselords: { id: "horselords", name: "Horse Lords", startTech: "riding", perk: "Riders cost 1 star less and need no horse", research: ["forestry", "sawmills", "hunting", "archery", "mining", "smelting", "trade", "logistics", "smithing", "farming", "masonry", "carpentry", "siege", "coinage"] },
	coastfolk: { id: "coastfolk", name: "Coastfolk", startTech: "fishing", perk: "Fish feeds cities twice as much", research: ["forestry", "sawmills", "sailing", "trade", "mining", "coinage", "navigation", "archery", "farming", "milling", "baking", "smelting", "diplomacy", "carpentry"] },
	plainsfolk: { id: "plainsfolk", name: "Plainsfolk", startTech: "farming", perk: "Farms produce double", research: ["forestry", "sawmills", "milling", "baking", "hunting", "archery", "mining", "trade", "smelting", "masonry", "smithing", "coinage", "carpentry", "engineering"] }
};

export const CIV_IDS = Object.keys(CIVS) as CivId[];

// ------------------------------------------------------------------
// City levels
// ------------------------------------------------------------------

export type RewardId = "income" | "income2" | "warrior" | "swordsman" | "borders" | "walls" | "store";

export const REWARDS: Record<RewardId, { name: string; description: string }> = {
	income: { name: "Workshop", description: "+1 star per turn" },
	income2: { name: "Guildhall", description: "+2 stars per turn" },
	warrior: { name: "Recruits", description: "A free warrior" },
	swordsman: { name: "Champion", description: "A free swordsman" },
	borders: { name: "Border growth", description: "Claim the next ring of tiles around the city" },
	walls: { name: "City walls", description: "Quadruples the defence of units in the city" },
	store: { name: "Supply cache", description: "+3 planks and +3 stone in the city store" }
};

/** The two rewards offered when a city reaches a level. */
export function levelRewards (level: number): [RewardId, RewardId] {
	if (level <= 2) return ["income", "warrior"];
	if (level === 3) return ["borders", "walls"];
	if (level === 4) return ["store", "income2"];
	return level % 2 ? ["borders", "swordsman"] : ["income2", "swordsman"];
}

/**
 * Growth points needed to go from `level` to the next: 2, 5, 10, 17, 26...
 * Food arrives every turn, so needs rise with the square of the level to keep
 * big cities (and their star income) from running away.
 */
export function growthNeeded (level: number): number {
	return level * level + 1;
}

/**
 * Stars a city earns at a level: 1 and 2 for levels 1 and 2, then one more
 * every two levels (big cities earned too much when this was linear).
 */
export function levelIncome (level: number): number {
	return level <= 2 ? level : 2 + Math.floor((level - 2) / 2);
}

/** Buildings a city can run at a level. */
export function buildingSlots (level: number): number {
	return level + 1;
}

/** Goods every capital starts with, so the first buildings can be finished. */
export const STARTING_STORE: Goods = { logs: 4, planks: 4, stone: 3, tools: 1 };
export const STARTING_STARS = 6;

// ------------------------------------------------------------------
// Logistics
// ------------------------------------------------------------------

/** Road tiles a carrier moves per turn. */
export const CARRIER_SPEED = 4;
/** Sea lanes between a civ's ports are at most this many water tiles long. */
export const SEA_LANE_LENGTH = 40;

/** Cargo that can enter one road tile per turn. */
export const ROAD_CAPACITY = 2;

// ------------------------------------------------------------------
// Ambitions (Civilization VII-style goals, raced for bonuses)
// ------------------------------------------------------------------

export type AmbitionId = "conquest" | "expansion" | "industry" | "knowledge" | "diplomacy" | "wonders";

/** What a milestone counts. */
export type Measure =
	| "kills" | "conquered" | "cities" | "produced" | "techs"
	| "met" | "treaties" | "alliances" | "friends" | "monuments" | "worldWonders" | "wondersTotal";

export interface Ambition {
	id: AmbitionId;
	name: string;
	description: string;
	milestones: { text: string; measure: Measure; target: number }[];
	legacy: { name: string; description: string };
}

export const AMBITIONS: Record<AmbitionId, Ambition> = {
	conquest: {
		id: "conquest", name: "Conquest", description: "Win battles and take cities.",
		milestones: [
			{ text: "Win 3 battles", measure: "kills", target: 3 },
			{ text: "Capture a city from another civ", measure: "conquered", target: 1 },
			{ text: "Win 15 battles", measure: "kills", target: 15 },
			{ text: "Capture 3 cities from other civs", measure: "conquered", target: 3 }
		],
		legacy: { name: "Warlords", description: "Your units deal 20% more damage." }
	},
	expansion: {
		id: "expansion", name: "Expansion", description: "Spread your cities across the land.",
		milestones: [
			{ text: "Hold 3 cities", measure: "cities", target: 3 },
			{ text: "Hold 6 cities", measure: "cities", target: 6 },
			{ text: "Hold 9 cities", measure: "cities", target: 9 },
			{ text: "Hold 12 cities", measure: "cities", target: 12 }
		],
		legacy: { name: "Founders", description: "Running your cities costs half the administration." }
	},
	industry: {
		id: "industry", name: "Industry", description: "Build up production chains.",
		milestones: [
			{ text: "Produce 40 goods", measure: "produced", target: 40 },
			{ text: "Produce 150 goods", measure: "produced", target: 150 },
			{ text: "Produce 400 goods", measure: "produced", target: 400 },
			{ text: "Produce 800 goods", measure: "produced", target: 800 }
		],
		legacy: { name: "Guilds", description: "+1 star a turn for every 4 working buildings." }
	},
	knowledge: {
		id: "knowledge", name: "Knowledge", description: "Research the technology tree.",
		milestones: [
			{ text: "Know 5 technologies", measure: "techs", target: 5 },
			{ text: "Know 9 technologies", measure: "techs", target: 9 },
			{ text: "Know 13 technologies", measure: "techs", target: 13 },
			{ text: "Know 17 technologies", measure: "techs", target: 17 }
		],
		legacy: { name: "Enlightened", description: "Research costs half." }
	},
	diplomacy: {
		id: "diplomacy", name: "Diplomacy", description: "Make friends and treaties.",
		milestones: [
			{ text: "Meet 2 civs", measure: "met", target: 2 },
			{ text: "Hold 2 treaties at once (open borders, trade, pact)", measure: "treaties", target: 2 },
			{ text: "Form an alliance", measure: "alliances", target: 1 },
			{ text: "Be liked (Friendly) by 2 civs at once", measure: "friends", target: 2 }
		],
		legacy: { name: "Peacemakers", description: "+3 World Council votes, and other civs warm to you over time." }
	},
	wonders: {
		id: "wonders", name: "Wonders", description: "Raise monuments and world wonders.",
		milestones: [
			{ text: "Build a monument", measure: "monuments", target: 1 },
			{ text: "Build a world wonder", measure: "worldWonders", target: 1 },
			{ text: "Own 4 wonders and monuments", measure: "wondersTotal", target: 4 },
			{ text: "Own 7 wonders and monuments", measure: "wondersTotal", target: 7 }
		],
		legacy: { name: "Patrons", description: "+2 stars a turn for every wonder and monument you own." }
	}
};

export const AMBITION_IDS = Object.keys(AMBITIONS) as AmbitionId[];

/** Stars for reaching milestone `index` (0-3); the first civ to reach it gets double. */
export function milestoneStars (index: number): number {
	return 5 * (index + 1);
}
export const MILESTONE_SCORE = 10;
/** Score for completing an ambition, and extra for the first civ to complete it. */
export const LEGACY_SCORE = 30;
export const FIRST_LEGACY_SCORE = 50;

// ------------------------------------------------------------------
// Diplomacy
// ------------------------------------------------------------------

export type AgendaId = "expansionist" | "merchant" | "militarist" | "builder" | "peacemaker" | "scholar";

export const AGENDAS: Record<AgendaId, { name: string; description: string }> = {
	expansionist: { name: "Expansionist", description: "Resents civs with more cities; warms to smaller ones." },
	merchant: { name: "Merchant", description: "Likes trade partners and trade routes; dislikes sanctions." },
	militarist: { name: "Militarist", description: "Respects strong armies; looks down on weak ones." },
	builder: { name: "Builder", description: "Envies civs with more wonders and monuments." },
	peacemaker: { name: "Peacemaker", description: "Dislikes civs that start wars." },
	scholar: { name: "Scholar", description: "Likes research partners; resents civs ahead in technology." }
};

export const AGENDA_IDS = Object.keys(AGENDAS) as AgendaId[];

/** Turns after peace during which neither side may declare war. */
export const TRUCE_TURNS = 10;
/** Grievances against a civ that justify a war on it (no warmonger penalty). */
export const CASUS_BELLI = 4;
/** Cultural exchange: paid by the proposer; both civs gain a star a turn and warm to each other. */
export const EXCHANGE_COST = 12;
export const EXCHANGE_TURNS = 10;
/** Research agreement: both pay (10 stars plus 2 per city each); both get a free technology when it ends. */
export const RESEARCH_COST = 10;
export function researchAgreementCost (cities: number): number {
	return RESEARCH_COST + 2 * cities;
}
export const RESEARCH_TURNS = 8;
export const DENOUNCE_COST = 5;
/** Sanctions cut the target's star income by a share for some turns. */
export const SANCTION_COST = 15;
export const SANCTION_TURNS = 10;
export const SANCTION_SHARE = 0.15;
/** Trade routes run this many turns. */
export const ROUTE_TURNS = 10;
