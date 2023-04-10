var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../../engine/instance.js";
import { BuildingType } from "../enums/BuildingType.js";
import { createFactoryBuilding, createFlagBuilding, createMiningBuilding, createStorageBuilding } from "../services/createBuilding.js";
import { newIdHex } from "../../engine/utils.js";
import { Road } from "../entities/Road.js";
import { Transporter } from "../entities/Transporter.js";
export const controllerServer = () => __awaiter(void 0, void 0, void 0, function* () {
    const tileMap1 = ige.$("tileMap1");
    const createBuilding = (data, clientId, requestCallback) => __awaiter(void 0, void 0, void 0, function* () {
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
            case BuildingType.factory: {
                const building = createFactoryBuilding(tileMap1, newIdHex(), x, y);
                return requestCallback(building.id());
            }
            case BuildingType.mine: {
                console.log("Create mine", data.resourceType);
                const building = createMiningBuilding(tileMap1, newIdHex(), x, y, data.resourceType);
                return requestCallback(building.id());
            }
        }
    });
    const createRoad = (data, clientId, requestCallback) => __awaiter(void 0, void 0, void 0, function* () {
        const fromId = data.fromId;
        const toId = data.toId;
        const road = new Road(fromId, toId).mount(tileMap1);
        // Create the transporter
        const base = ige.$("base1");
        new Transporter(base.id(), fromId, toId)
            .translateTo(base._translate.x, base._translate.y, 0)
            .mount(tileMap1);
        requestCallback(road.id());
    });
    ige.network.define("createBuilding", createBuilding);
    ige.network.define("createRoad", createRoad);
    return () => __awaiter(void 0, void 0, void 0, function* () {
    });
});
