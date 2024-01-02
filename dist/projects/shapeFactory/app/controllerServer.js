import { ige } from "../../../engine/instance.js"
import { newIdHex } from "../../../engine/utils.js"
import { createFactoryBuilding1, createFactoryBuilding2, createFlagBuilding, createHouseBuilding1, createMiningBuilding, createStorageBuilding } from "../services/createBuilding.js"
import { BuildingType } from "../enums/BuildingType.js"
import { Road } from "../entities/Road.js"
import { Transporter } from "../entities/Transporter.js"
export const controllerServer = async () => {
    const tileMap1 = ige.$("tileMap1");
    const createBuilding = async (data, clientId, requestCallback) => {
        const buildingType = data.buildingType;
        const x = data.x;
        const y = data.y;
        switch (buildingType) {
            case BuildingType.storage: {
                const building = createStorageBuilding(tileMap1, newIdHex(), x, y);
                return requestCallback(building.id());
            }
            case BuildingType.flag: {
                const building = createFlagBuilding(tileMap1, newIdHex(), x, y);
                return requestCallback(building.id());
            }
            case BuildingType.factory1: {
                const building = createFactoryBuilding1(tileMap1, newIdHex(), x, y);
                return requestCallback(building.id());
            }
            case BuildingType.factory2: {
                const building = createFactoryBuilding2(tileMap1, newIdHex(), x, y);
                return requestCallback(building.id());
            }
            case BuildingType.mine: {
                console.log("Create mine", data.resourceType);
                const building = createMiningBuilding(tileMap1, newIdHex(), x, y, data.resourceType);
                return requestCallback(building.id());
            }
            case BuildingType.house1: {
                console.log("Create house 1", data.resourceType);
                const building = createHouseBuilding1(tileMap1, newIdHex(), x, y, data.resourceType);
                return requestCallback(building.id());
            }
        }
    };
    const createRoad = async (data, clientId, requestCallback) => {
        const fromId = data.fromId;
        const toId = data.toId;
        const road = new Road(fromId, toId).mount(tileMap1);
        // Create the transporter
        const base = ige.$("base1");
        new Transporter(base.id(), fromId, toId).translateTo(base._translate.x, base._translate.y, 0).mount(tileMap1);
        requestCallback(road.id());
    };
    const debug = () => {
        const resources = ige.$$("resource");
        debugger;
    };
    ige.network.define("createBuilding", createBuilding);
    ige.network.define("createRoad", createRoad);
    ige.network.define("debug", debug);
    return async () => { };
};