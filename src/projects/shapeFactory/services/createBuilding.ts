import type { IgeTileMap2d } from "@/engine/core/IgeTileMap2d";
import { ResourceType } from "../enums/ResourceType";
import { FactoryBuilding1 } from "../entities/FactoryBuilding1";
import { FactoryBuilding2 } from "../entities/FactoryBuilding2";
import { FlagBuilding } from "../entities/FlagBuilding";
import { HouseBuilding1 } from "../entities/HouseBuilding1";
import { MiningBuilding } from "../entities/MiningBuilding";
import { StorageBuilding } from "../entities/StorageBuilding";

export const createStorageBuilding = (parent: IgeTileMap2d, id: string, tileX: number, tileY: number) => {
	const roadOffsetX = 0;
	const roadOffsetY = 3;

	const newBuilding = new StorageBuilding(tileX, tileY).id(id).mount(parent).translateToTile(tileX, tileY, 0);

	// // Check if a flag already exists
	// const existingFlag = parent.tileOccupiedBy(tileX + roadOffsetX, tileY + roadOffsetY) as FlagBuilding;
	//
	// if (existingFlag) {
	// 	newBuilding.flag = existingFlag;
	// } else {
	// 	newBuilding.flag = new FlagBuilding(tileX + roadOffsetX, tileY + roadOffsetY)
	// 		.mount(parent)
	// 		.translateToTile(tileX + roadOffsetX, tileY + roadOffsetY, 0);
	// }
	//
	// new Road(newBuilding.id(), newBuilding.flag.id())
	// 	.mount(parent);
	//
	// new Transporter(newBuilding.id(), newBuilding.id(), newBuilding.flag.id())
	// 	.translateTo(newBuilding._translate.x, newBuilding._translate.y, 0)
	// 	.mount(parent);

	return newBuilding;
};

export const createMiningBuilding = (
	parent: IgeTileMap2d,
	id: string,
	tileX: number,
	tileY: number,
	resourceType: ResourceType
) => {
	const roadOffsetX = 0;
	const roadOffsetY = 2;

	const newBuilding = new MiningBuilding(tileX, tileY, resourceType, [])
		.id(id)
		.mount(parent)
		.translateToTile(tileX, tileY, 0);

	// // Check if a flag already exists
	// const existingFlag = parent.tileOccupiedBy(tileX + roadOffsetX, tileY + roadOffsetY) as FlagBuilding;
	//
	// if (existingFlag) {
	// 	newBuilding.flag = existingFlag;
	// } else {
	// 	newBuilding.flag = new FlagBuilding(tileX + roadOffsetX, tileY + roadOffsetY)
	// 		.mount(parent)
	// 		.translateToTile(tileX + roadOffsetX, tileY + roadOffsetY, 0);
	// }
	//
	// new Road(newBuilding.id(), newBuilding.flag.id())
	// 	.mount(parent);
	//
	// const base = ige.$("base1") as StorageBuilding;
	//
	// new Transporter(base.id(), newBuilding.id(), newBuilding.flag.id())
	// 	.translateTo(base._translate.x, base._translate.y, 0)
	// 	.mount(parent);

	return newBuilding;
};

export const createHouseBuilding1 = (parent: IgeTileMap2d, id: string, tileX: number, tileY: number) => {
	const roadOffsetX = 0;
	const roadOffsetY = 2;

	const newBuilding = new HouseBuilding1(tileX, tileY, ResourceType.gold, [
		{ count: 1, type: ResourceType.science, max: 1 },
		{ count: 1, type: ResourceType.energy, max: 1 }
	])
		.id(id)
		.mount(parent)
		.translateToTile(tileX, tileY, 0);

	return newBuilding;
};

export const createFactoryBuilding1 = (parent: IgeTileMap2d, id: string, tileX: number, tileY: number) => {
	// TODO Make the produces and requires parameters of the createFactoryBuilding()
	const roadOffsetX = 0;
	const roadOffsetY = 3;

	const newBuilding = new FactoryBuilding1(tileX, tileY, ResourceType.energy, [
		{
			type: ResourceType.elerium,
			count: 1,
			max: 1
		},
		{
			type: ResourceType.uranium,
			count: 1,
			max: 1
		}
	])
		.id(id)
		.mount(parent)
		.translateToTile(tileX, tileY, 0);

	// // Check if a flag already exists
	// const existingFlag = parent.tileOccupiedBy(tileX + roadOffsetX, tileY + roadOffsetY) as FlagBuilding;
	//
	// if (existingFlag) {
	// 	newBuilding.flag = existingFlag;
	// } else {
	// 	newBuilding.flag = new FlagBuilding(tileX + roadOffsetX, tileY + roadOffsetY)
	// 		.mount(parent)
	// 		.translateToTile(tileX + roadOffsetX, tileY + roadOffsetY, 0);
	// }
	//
	// new Road(newBuilding.id(), newBuilding.flag.id())
	// 	.mount(parent);
	//
	// const base = ige.$("base1") as StorageBuilding;
	//
	// new Transporter(base.id(), newBuilding.id(), newBuilding.flag.id())
	// 	.translateTo(base._translate.x, base._translate.y, 0)
	// 	.mount(parent);

	return newBuilding;
};

export const createFactoryBuilding2 = (parent: IgeTileMap2d, id: string, tileX: number, tileY: number) => {
	// TODO Make the produces and requires parameters of the createFactoryBuilding()
	const roadOffsetX = 0;
	const roadOffsetY = 3;

	const newBuilding = new FactoryBuilding2(tileX, tileY, ResourceType.science, [
		{
			type: ResourceType.energy,
			count: 1,
			max: 1
		},
		{
			type: ResourceType.elerium,
			count: 1,
			max: 1
		},
		{
			type: ResourceType.uranium,
			count: 1,
			max: 1
		}
	])
		.id(id)
		.mount(parent)
		.translateToTile(tileX, tileY, 0);

	// // Check if a flag already exists
	// const existingFlag = parent.tileOccupiedBy(tileX + roadOffsetX, tileY + roadOffsetY) as FlagBuilding;
	//
	// if (existingFlag) {
	// 	newBuilding.flag = existingFlag;
	// } else {
	// 	newBuilding.flag = new FlagBuilding(tileX + roadOffsetX, tileY + roadOffsetY)
	// 		.mount(parent)
	// 		.translateToTile(tileX + roadOffsetX, tileY + roadOffsetY, 0);
	// }
	//
	// new Road(newBuilding.id(), newBuilding.flag.id())
	// 	.mount(parent);
	//
	// const base = ige.$("base1") as StorageBuilding;
	//
	// new Transporter(base.id(), newBuilding.id(), newBuilding.flag.id())
	// 	.translateTo(base._translate.x, base._translate.y, 0)
	// 	.mount(parent);

	return newBuilding;
};

export const createFlagBuilding = (parent: IgeTileMap2d, id: string, tileX: number, tileY: number) => {
	const newBuilding = new FlagBuilding(tileX, tileY).id(id).mount(parent).translateToTile(tileX, tileY, 0);

	return newBuilding;
};
