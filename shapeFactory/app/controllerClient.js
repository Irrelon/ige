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
import { IgeFSM } from "../../engine/core/IgeFSM.js";
import { BuildingType } from "../enums/BuildingType.js";
import { StorageBuilding } from "../entities/StorageBuilding.js";
import { IgeBehaviourType } from "../../enums/IgeBehaviourType.js";
import { IgeInputDevice, IgeInputPointerMap } from "../../enums/IgeInputDeviceMap.js";
import { newIdHex } from "../../engine/utils.js";
import { FactoryBuilding } from "../entities/FactoryBuilding.js";
import { ResourceType } from "../enums/ResourceType.js";
import { createFactoryBuilding, createStorageBuilding } from "../services/createBuilding.js";
export const controllerClient = () => __awaiter(void 0, void 0, void 0, function* () {
    const uiCreateStorage = ige.$("uiCreateStorage");
    const uiCreateFactory = ige.$("uiCreateFactory");
    const fsm = new IgeFSM();
    fsm.defineState("idle", {
        enter: () => __awaiter(void 0, void 0, void 0, function* () {
            console.log("Entered idle");
            uiCreateStorage.pointerUp(() => {
                fsm.data("createBuilding", BuildingType.storage);
                fsm.enterState("createBuilding");
            });
            uiCreateFactory.pointerUp(() => {
                fsm.data("createBuilding", BuildingType.factory);
                fsm.data("createArgs", [ResourceType.energy, [{
                            type: ResourceType.wood,
                            count: 1,
                            max: 3
                        }, {
                            type: ResourceType.grain,
                            count: 1,
                            max: 3
                        }]]);
                fsm.enterState("createBuilding");
            });
        }),
        exit: () => __awaiter(void 0, void 0, void 0, function* () {
            uiCreateStorage.pointerUp(null);
            uiCreateFactory.pointerUp(null);
        })
    });
    fsm.defineState("createBuilding", {
        enter: () => __awaiter(void 0, void 0, void 0, function* () {
            const buildingType = fsm.data("createBuilding");
            const createArgs = fsm.data("createArgs");
            console.log("Entered createBuilding", buildingType);
            // Get the scene to mount to
            const scene1 = ige.$("scene1");
            // Remove any existing temp building
            const existingTmpBuilding = ige.$("tmpBuilding");
            if (existingTmpBuilding) {
                existingTmpBuilding.destroy();
            }
            // Set the temporary cursor-following building
            switch (buildingType) {
                case BuildingType.storage:
                    new StorageBuilding()
                        .id("tmpBuilding")
                        .mount(scene1);
                    break;
                case BuildingType.factory:
                    new FactoryBuilding(createArgs[0], createArgs[1])
                        .id("tmpBuilding")
                        .mount(scene1);
                    break;
            }
        }),
        click: () => __awaiter(void 0, void 0, void 0, function* () {
            const gridX = Math.round(ige._pointerPos.x / 100) * 100;
            const gridY = Math.round(ige._pointerPos.y / 100) * 100;
            // Check the location and determine if we can build there
            // Get the scene to mount to
            const scene1 = ige.$("scene1");
            // Get the building details
            const buildingType = fsm.data("createBuilding");
            const createArgs = fsm.data("createArgs");
            switch (buildingType) {
                case BuildingType.storage:
                    createStorageBuilding(scene1, newIdHex(), gridX, gridY);
                    break;
                case BuildingType.factory:
                    createFactoryBuilding(scene1, newIdHex(), gridX, gridY);
                    break;
            }
            // Place the building
            const existingTmpBuilding = ige.$("tmpBuilding");
            existingTmpBuilding.destroy();
            // Enter back into idle state
            yield fsm.enterState("idle");
        }),
        exit: () => __awaiter(void 0, void 0, void 0, function* () {
            const tmpBuilding = ige.$("tmpBuilding");
            if (!tmpBuilding)
                return;
            // Destroy the tmp building
            tmpBuilding.destroy();
        })
    });
    fsm.defineState("createRoad");
    fsm.defineState("destroyObject");
    yield fsm.initialState("idle");
    ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour", () => {
        if (ige.input.state(IgeInputDevice.pointer1, IgeInputPointerMap.button0)) {
            fsm.raiseEvent("click");
        }
        const tmpBuilding = ige.$("tmpBuilding");
        if (!tmpBuilding)
            return;
        const gridX = Math.round(ige._pointerPos.x / 100) * 100;
        const gridY = Math.round(ige._pointerPos.y / 100) * 100;
        tmpBuilding.translateTo(gridX, gridY, 0);
    });
    return () => __awaiter(void 0, void 0, void 0, function* () {
        ige.engine.removeBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour");
    });
});
