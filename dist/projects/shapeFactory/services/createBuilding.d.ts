import type { IgeTileMap2d } from "../../../engine/core/IgeTileMap2d.js"
import { ResourceType } from "../enums/ResourceType.js"
import { FactoryBuilding1 } from "../entities/FactoryBuilding1.js"
import { FactoryBuilding2 } from "../entities/FactoryBuilding2.js"
import { FlagBuilding } from "../entities/FlagBuilding.js"
import { HouseBuilding1 } from "../entities/HouseBuilding1.js"
import { MiningBuilding } from "../entities/MiningBuilding.js"
import { StorageBuilding } from "../entities/StorageBuilding.js"
export declare const createStorageBuilding: (parent: IgeTileMap2d, id: string, tileX: number, tileY: number) => StorageBuilding;
export declare const createMiningBuilding: (parent: IgeTileMap2d, id: string, tileX: number, tileY: number, resourceType: ResourceType) => MiningBuilding;
export declare const createHouseBuilding1: (parent: IgeTileMap2d, id: string, tileX: number, tileY: number) => HouseBuilding1;
export declare const createFactoryBuilding1: (parent: IgeTileMap2d, id: string, tileX: number, tileY: number) => FactoryBuilding1;
export declare const createFactoryBuilding2: (parent: IgeTileMap2d, id: string, tileX: number, tileY: number) => FactoryBuilding2;
export declare const createFlagBuilding: (parent: IgeTileMap2d, id: string, tileX: number, tileY: number) => FlagBuilding;
