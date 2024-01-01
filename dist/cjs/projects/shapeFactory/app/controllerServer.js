"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.controllerServer = void 0;
const instance_1 = require("@/engine/instance");
const BuildingType_1 = require("../enums/BuildingType");
const createBuilding_1 = require("../services/createBuilding");
const utils_1 = require("@/engine/utils");
const Road_1 = require("../entities/Road");
const Transporter_1 = require("../entities/Transporter");
const controllerServer = () => __awaiter(void 0, void 0, void 0, function* () {
    const tileMap1 = instance_1.ige.$("tileMap1");
    const createBuilding = (data, clientId, requestCallback) => __awaiter(void 0, void 0, void 0, function* () {
        const buildingType = data.buildingType;
        const x = data.x;
        const y = data.y;
        switch (buildingType) {
            case BuildingType_1.BuildingType.storage: {
                const building = (0, createBuilding_1.createStorageBuilding)(tileMap1, (0, utils_1.newIdHex)(), x, y);
                return requestCallback(building.id());
            }
            case BuildingType_1.BuildingType.flag: {
                const building = (0, createBuilding_1.createFlagBuilding)(tileMap1, (0, utils_1.newIdHex)(), x, y);
                return requestCallback(building.id());
            }
            case BuildingType_1.BuildingType.factory1: {
                const building = (0, createBuilding_1.createFactoryBuilding1)(tileMap1, (0, utils_1.newIdHex)(), x, y);
                return requestCallback(building.id());
            }
            case BuildingType_1.BuildingType.factory2: {
                const building = (0, createBuilding_1.createFactoryBuilding2)(tileMap1, (0, utils_1.newIdHex)(), x, y);
                return requestCallback(building.id());
            }
            case BuildingType_1.BuildingType.mine: {
                console.log("Create mine", data.resourceType);
                const building = (0, createBuilding_1.createMiningBuilding)(tileMap1, (0, utils_1.newIdHex)(), x, y, data.resourceType);
                return requestCallback(building.id());
            }
            case BuildingType_1.BuildingType.house1: {
                console.log("Create house 1", data.resourceType);
                const building = (0, createBuilding_1.createHouseBuilding1)(tileMap1, (0, utils_1.newIdHex)(), x, y, data.resourceType);
                return requestCallback(building.id());
            }
        }
    });
    const createRoad = (data, clientId, requestCallback) => __awaiter(void 0, void 0, void 0, function* () {
        const fromId = data.fromId;
        const toId = data.toId;
        const road = new Road_1.Road(fromId, toId).mount(tileMap1);
        // Create the transporter
        const base = instance_1.ige.$("base1");
        new Transporter_1.Transporter(base.id(), fromId, toId)
            .translateTo(base._translate.x, base._translate.y, 0)
            .mount(tileMap1);
        requestCallback(road.id());
    });
    const debug = () => {
        const resources = instance_1.ige.$$("resource");
        debugger;
    };
    instance_1.ige.network.define("createBuilding", createBuilding);
    instance_1.ige.network.define("createRoad", createRoad);
    instance_1.ige.network.define("debug", debug);
    return () => __awaiter(void 0, void 0, void 0, function* () {
    });
});
exports.controllerServer = controllerServer;
