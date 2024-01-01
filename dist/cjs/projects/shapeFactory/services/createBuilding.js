"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFlagBuilding = exports.createFactoryBuilding2 = exports.createFactoryBuilding1 = exports.createHouseBuilding1 = exports.createMiningBuilding = exports.createStorageBuilding = void 0;
const StorageBuilding_1 = require("../entities/StorageBuilding");
const FlagBuilding_1 = require("../entities/FlagBuilding");
const MiningBuilding_1 = require("../entities/MiningBuilding");
const ResourceType_1 = require("../enums/ResourceType");
const FactoryBuilding1_1 = require("../entities/FactoryBuilding1");
const FactoryBuilding2_1 = require("../entities/FactoryBuilding2");
const HouseBuilding1_1 = require("../entities/HouseBuilding1");
const createStorageBuilding = (parent, id, tileX, tileY) => {
    const roadOffsetX = 0;
    const roadOffsetY = 3;
    const newBuilding = new StorageBuilding_1.StorageBuilding(tileX, tileY)
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
    // new Transporter(newBuilding.id(), newBuilding.id(), newBuilding.flag.id())
    // 	.translateTo(newBuilding._translate.x, newBuilding._translate.y, 0)
    // 	.mount(parent);
    return newBuilding;
};
exports.createStorageBuilding = createStorageBuilding;
const createMiningBuilding = (parent, id, tileX, tileY, resourceType) => {
    const roadOffsetX = 0;
    const roadOffsetY = 2;
    const newBuilding = new MiningBuilding_1.MiningBuilding(tileX, tileY, resourceType, [])
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
exports.createMiningBuilding = createMiningBuilding;
const createHouseBuilding1 = (parent, id, tileX, tileY) => {
    const roadOffsetX = 0;
    const roadOffsetY = 2;
    const newBuilding = new HouseBuilding1_1.HouseBuilding1(tileX, tileY, ResourceType_1.ResourceType.gold, [{ count: 1, type: ResourceType_1.ResourceType.science, max: 1 }, { count: 1, type: ResourceType_1.ResourceType.energy, max: 1 }])
        .id(id)
        .mount(parent)
        .translateToTile(tileX, tileY, 0);
    return newBuilding;
};
exports.createHouseBuilding1 = createHouseBuilding1;
const createFactoryBuilding1 = (parent, id, tileX, tileY) => {
    // TODO Make the produces and requires parameters of the createFactoryBuilding()
    const roadOffsetX = 0;
    const roadOffsetY = 3;
    const newBuilding = new FactoryBuilding1_1.FactoryBuilding1(tileX, tileY, ResourceType_1.ResourceType.energy, [{
            type: ResourceType_1.ResourceType.elerium,
            count: 1,
            max: 1
        }, {
            type: ResourceType_1.ResourceType.uranium,
            count: 1,
            max: 1
        }])
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
exports.createFactoryBuilding1 = createFactoryBuilding1;
const createFactoryBuilding2 = (parent, id, tileX, tileY) => {
    // TODO Make the produces and requires parameters of the createFactoryBuilding()
    const roadOffsetX = 0;
    const roadOffsetY = 3;
    const newBuilding = new FactoryBuilding2_1.FactoryBuilding2(tileX, tileY, ResourceType_1.ResourceType.science, [{
            type: ResourceType_1.ResourceType.energy,
            count: 1,
            max: 1
        }, {
            type: ResourceType_1.ResourceType.elerium,
            count: 1,
            max: 1
        }, {
            type: ResourceType_1.ResourceType.uranium,
            count: 1,
            max: 1
        }])
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
exports.createFactoryBuilding2 = createFactoryBuilding2;
const createFlagBuilding = (parent, id, tileX, tileY) => {
    const newBuilding = new FlagBuilding_1.FlagBuilding(tileX, tileY)
        .id(id)
        .mount(parent)
        .translateToTile(tileX, tileY, 0);
    return newBuilding;
};
exports.createFlagBuilding = createFlagBuilding;
