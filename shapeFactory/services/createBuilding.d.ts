import { StorageBuilding } from "../entities/StorageBuilding";
import { MiningBuilding } from "../entities/MiningBuilding";
import { ResourceType } from "../enums/ResourceType";
import { FactoryBuilding } from "../entities/FactoryBuilding";
import type { IgeScene2d } from "@/engine/core/IgeScene2d";
export declare const createStorageBuilding: (parent: IgeScene2d, id: string, x: number, y: number) => StorageBuilding;
export declare const createMiningBuilding: (parent: IgeScene2d, id: string, x: number, y: number, resourceType: ResourceType) => MiningBuilding;
export declare const createFactoryBuilding: (parent: IgeScene2d, id: string, x: number, y: number) => FactoryBuilding;
