import type { PaletteKey } from "./palette";

export enum Terrain {
	DeepOcean = 0,
	Ocean = 1,
	Ice = 2,
	Grassland = 3,
	Plains = 4,
	Desert = 5,
	Tundra = 6,
	Snow = 7
}

/** Height class of a tile. Each step raises the tile's top. */
export enum Relief {
	Water = 0,
	Flat = 1,
	Hills = 2,
	Mountain = 3
}

export enum Feature {
	None = 0,
	Forest = 1,
	Jungle = 2,
	Pine = 3
}

export interface TerrainInfo {
	name: string;
	/** Palette row for the tile's top. */
	top: PaletteKey;
	/** Palette row for cliff walls below the top. */
	wall: PaletteKey;
	water: boolean;
	/** Top height for water terrain (land uses its relief height). */
	waterHeight: number;
	/** Can found a city here (flat or hills). */
	settleable: boolean;
}

export const TERRAIN_INFO: Record<Terrain, TerrainInfo> = {
	[Terrain.DeepOcean]: { name: "Deep Ocean", top: "deepOcean", wall: "seabed", water: true, waterHeight: -14, settleable: false },
	[Terrain.Ocean]: { name: "Coast", top: "ocean", wall: "seabed", water: true, waterHeight: -8, settleable: false },
	[Terrain.Ice]: { name: "Pack Ice", top: "ice", wall: "iceWall", water: true, waterHeight: -3, settleable: false },
	[Terrain.Grassland]: { name: "Grassland", top: "grassland", wall: "dirt", water: false, waterHeight: 0, settleable: true },
	[Terrain.Plains]: { name: "Plains", top: "plains", wall: "dirt", water: false, waterHeight: 0, settleable: true },
	[Terrain.Desert]: { name: "Desert", top: "desert", wall: "sand", water: false, waterHeight: 0, settleable: true },
	[Terrain.Tundra]: { name: "Tundra", top: "tundra", wall: "frozenDirt", water: false, waterHeight: 0, settleable: true },
	[Terrain.Snow]: { name: "Snow", top: "snow", wall: "frozenDirt", water: false, waterHeight: 0, settleable: true }
};

export const RELIEF_NAMES: Record<Relief, string> = {
	[Relief.Water]: "",
	[Relief.Flat]: "",
	[Relief.Hills]: "Hills",
	[Relief.Mountain]: "Mountains"
};

export const FEATURE_NAMES: Record<Feature, string> = {
	[Feature.None]: "",
	[Feature.Forest]: "Forest",
	[Feature.Jungle]: "Jungle",
	[Feature.Pine]: "Pine Forest"
};

/** Top heights of land tiles by relief (world units, Y up). */
export const LAND_HEIGHT: Record<Relief, number> = {
	[Relief.Water]: 0,
	[Relief.Flat]: 6,
	[Relief.Hills]: 18,
	[Relief.Mountain]: 30
};

/** Bottom of the map slab; map-edge walls drop to here. */
export const FLOOR_HEIGHT = -40;

/** How far each tile's bevelled rim drops below its top. */
export const LAND_BEVEL = 2.5;
export const WATER_BEVEL = 0.6;

/** Movement cost to enter a tile, or Infinity if land units cannot. */
export function moveCostFor (terrain: Terrain, relief: Relief, feature: Feature): number {
	if (TERRAIN_INFO[terrain].water || relief === Relief.Mountain) return Infinity;
	let cost = relief === Relief.Hills ? 2 : 1;
	if (feature !== Feature.None) cost += 1;
	return cost;
}
