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
import { FactoryBuilding } from "../entities/FactoryBuilding.js";
import { ResourceType } from "../enums/ResourceType.js";
import { Line } from "../entities/base/Line.js";
import { FlagBuilding } from "../entities/FlagBuilding.js";
import { MiningBuilding } from "../entities/MiningBuilding.js";
export const controllerClient = () => __awaiter(void 0, void 0, void 0, function* () {
    const network = ige.network;
    const uiCreateStorage = ige.$("uiCreateStorage");
    const uiCreateFactory = ige.$("uiCreateFactory");
    const uiCreateMine1 = ige.$("uiCreateMine1");
    const uiCreateMine2 = ige.$("uiCreateMine2");
    const uiCreateFlag = ige.$("uiCreateFlag");
    const fsm = new IgeFSM();
    fsm.defineState("idle", {
        enter: () => __awaiter(void 0, void 0, void 0, function* () {
            console.log("Entered idle");
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
            uiCreateStorage.pointerUp(() => {
                fsm.data("createBuilding", BuildingType.storage);
                fsm.enterState("createBuilding");
            });
            uiCreateFlag.pointerUp(() => {
                fsm.data("createBuilding", BuildingType.flag);
                fsm.enterState("createBuilding");
            });
            uiCreateMine1.pointerUp(() => {
                fsm.data("createBuilding", BuildingType.mine);
                fsm.data("createArgs", [ResourceType.grain]);
                fsm.enterState("createBuilding");
            });
            uiCreateMine2.pointerUp(() => {
                fsm.data("createBuilding", BuildingType.mine);
                fsm.data("createArgs", [ResourceType.wood]);
                fsm.enterState("createBuilding");
            });
        }),
        exit: () => __awaiter(void 0, void 0, void 0, function* () {
            uiCreateStorage.pointerUp(null);
            uiCreateFactory.pointerUp(null);
        }),
        click: (building) => __awaiter(void 0, void 0, void 0, function* () {
            if (!building)
                return;
            if (building.classId === "FlagBuilding") {
                // User clicked on a flag, start road building
                // TODO: Later we should pop an options modal instead with other options
                //  like remove flag?
                yield fsm.enterState("createRoad", building);
            }
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
                case BuildingType.mine:
                    new MiningBuilding(ResourceType.none, [{ type: ResourceType.none, count: 0, max: 0 }])
                        .id("tmpBuilding")
                        .mount(scene1);
                    break;
                case BuildingType.flag:
                    new FlagBuilding()
                        .id("tmpBuilding")
                        .mount(scene1);
                    break;
            }
        }),
        exit: () => __awaiter(void 0, void 0, void 0, function* () {
            const tmpBuilding = ige.$("tmpBuilding");
            if (!tmpBuilding)
                return;
            // Destroy the tmp building
            tmpBuilding.destroy();
        }),
        pointerMove: () => __awaiter(void 0, void 0, void 0, function* () {
            const tmpBuilding = ige.$("tmpBuilding");
            if (!tmpBuilding)
                return;
            const gridX = Math.round(ige._pointerPos.x / 100) * 100;
            const gridY = Math.round(ige._pointerPos.y / 100) * 100;
            tmpBuilding.translateTo(gridX, gridY, 0);
        }),
        click: () => __awaiter(void 0, void 0, void 0, function* () {
            const gridX = Math.round(ige._pointerPos.x / 100) * 100;
            const gridY = Math.round(ige._pointerPos.y / 100) * 100;
            // Check the location and determine if we can build there
            // Get the building details
            const buildingType = fsm.data("createBuilding");
            const createArgs = fsm.data("createArgs") || [];
            const buildingId = yield network.request("createBuilding", {
                buildingType,
                x: gridX,
                y: gridY,
                resourceType: [createArgs[0]]
            });
            console.log("Building created", buildingId);
            // Place the building
            const existingTmpBuilding = ige.$("tmpBuilding");
            existingTmpBuilding.destroy();
            // Enter back into idle state
            yield fsm.enterState("idle");
        })
    });
    fsm.defineState("createRoad", {
        enter: (startFlag) => __awaiter(void 0, void 0, void 0, function* () {
            if (!startFlag) {
                throw new Error("Flag building was not passed when entering createRoad state!");
            }
            console.log("Entered createRoad");
            fsm.data("startFlag", startFlag);
            // Get the scene to mount to
            const scene1 = ige.$("scene1");
            // Remove any existing temp building
            const existingTmpBuilding = ige.$("tmpBuilding");
            if (existingTmpBuilding) {
                existingTmpBuilding.destroy();
            }
            new Line()
                .id("tmpBuilding")
                .mount(scene1);
        }),
        pointerMove: () => __awaiter(void 0, void 0, void 0, function* () {
            const tmpBuilding = ige.$("tmpBuilding");
            if (!tmpBuilding)
                return;
            const gridX = Math.round(ige._pointerPos.x / 100) * 100;
            const gridY = Math.round(ige._pointerPos.y / 100) * 100;
            const startFlag = fsm.data("startFlag");
            tmpBuilding.setLine(startFlag._translate.x, startFlag._translate.y, gridX, gridY);
        }),
        click: (building) => __awaiter(void 0, void 0, void 0, function* () {
            const scene1 = ige.$("scene1");
            const gridX = Math.round(ige._pointerPos.x / 100) * 100;
            const gridY = Math.round(ige._pointerPos.y / 100) * 100;
            let destinationFlagId;
            // Check the location and determine if we can build there
            // Check if the end is a flag and if not, create one
            if (!building) {
                // No building exists at the grid location, create a new flag
                destinationFlagId = yield network.request("createBuilding", {
                    buildingType: BuildingType.flag,
                    x: gridX,
                    y: gridY
                });
            }
            else if (building.classId === "FlagBuilding") {
                // The clicked end point is a flag, use this
                destinationFlagId = building.id();
            }
            else {
                // The clicked end point is a building, use it's existing flag
                destinationFlagId = building.flag.id();
            }
            // Place the building
            const existingTmpBuilding = ige.$("tmpBuilding");
            existingTmpBuilding.destroy();
            // Create the new connecting road
            const startFlag = fsm.data("startFlag");
            yield network.request("createRoad", {
                fromId: startFlag.id(),
                toId: destinationFlagId
            });
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
    fsm.defineState("destroyObject");
    yield fsm.initialState("idle");
    const onPointerUp = (evt, mx, my, button) => {
        // Run a hit test against the all the entities
        const buildings = ige.$$("building");
        // Loop the buildings and check against the AABB
        const foundBuilding = buildings.find((building) => {
            return building.bounds3dPolygon().pointInside(ige._pointerPos);
        });
        if (foundBuilding) {
            console.log("foundBuilding", foundBuilding);
        }
        fsm.raiseEvent("click", foundBuilding);
    };
    const onPointerMove = () => {
        fsm.raiseEvent("pointerMove");
        // // Run a hit test against the all the entities
        // const buildings = ige.$$("building") as Building[];
        //
        // // Loop the buildings and check against the AABB
        // const foundBuilding = buildings.find((building) => {
        // 	return building.bounds3dPolygon().pointInside(ige._pointerPos);
        // });
        //
        // if (foundBuilding) {
        // 	console.log("foundBuilding", foundBuilding);
        // }
    };
    ige.input.on("pointerUp", onPointerUp);
    ige.input.on("pointerMove", onPointerMove);
    // ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour", () => {
    //
    // });
    return () => __awaiter(void 0, void 0, void 0, function* () {
        ige.engine.removeBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour");
    });
});
