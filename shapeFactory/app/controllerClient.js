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
import { IgePoint3d } from "../../engine/core/IgePoint3d.js";
export const controllerClient = () => __awaiter(void 0, void 0, void 0, function* () {
    const network = ige.network;
    const uiCreateStorage = ige.$("uiCreateStorage");
    const uiCreateFactory = ige.$("uiCreateFactory");
    const uiCreateMine1 = ige.$("uiCreateMine1");
    const uiCreateMine2 = ige.$("uiCreateMine2");
    const uiCreateFlag = ige.$("uiCreateFlag");
    const fsm = new IgeFSM();
    const tileMap1 = ige.$("tileMap1");
    fsm.defineState("idle", {
        enter: () => __awaiter(void 0, void 0, void 0, function* () {
            console.log("Entered idle");
            uiCreateFactory.pointerUp(() => {
                fsm.data("createBuilding", BuildingType.factory);
                fsm.data("createArgs", [ResourceType.energy, [{
                            type: ResourceType.elerium,
                            count: 1,
                            max: 3
                        }, {
                            type: ResourceType.uranium,
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
                fsm.data("createArgs", [ResourceType.elerium]);
                fsm.enterState("createBuilding");
            });
            uiCreateMine2.pointerUp(() => {
                fsm.data("createBuilding", BuildingType.mine);
                fsm.data("createArgs", [ResourceType.uranium]);
                fsm.enterState("createBuilding");
            });
        }),
        exit: () => __awaiter(void 0, void 0, void 0, function* () {
            uiCreateStorage.pointerUp(null);
            uiCreateFactory.pointerUp(null);
        }),
        click: (mousePos, building) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("IDLE CLICK");
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
                        .mount(tileMap1);
                    break;
                case BuildingType.factory:
                    new FactoryBuilding(NaN, NaN, createArgs[0], createArgs[1])
                        .id("tmpBuilding")
                        .mount(tileMap1);
                    break;
                case BuildingType.mine:
                    new MiningBuilding(NaN, NaN, ResourceType.none, [])
                        .id("tmpBuilding")
                        .mount(tileMap1);
                    break;
                case BuildingType.flag:
                    new FlagBuilding()
                        .id("tmpBuilding")
                        .mount(tileMap1);
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
        pointerMove: (tilePos) => __awaiter(void 0, void 0, void 0, function* () {
            const tmpBuilding = ige.$("tmpBuilding");
            if (!tmpBuilding)
                return;
            // Check if the building is allowed to occupy this area
            if (tileMap1.isTileOccupied(tilePos.x + tmpBuilding.tileXDelta, tilePos.y + tmpBuilding.tileYDelta, tmpBuilding.tileW, tmpBuilding.tileH))
                return;
            tmpBuilding.translateToTile(tilePos.x, tilePos.y, 0);
        }),
        click: (tilePos) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("CREATE BUILDING CLICK");
            const existingTmpBuilding = ige.$("tmpBuilding");
            const buildLocation = tileMap1.pointToTile(existingTmpBuilding._translate);
            // Check the location and determine if we can build there
            // Get the building details
            const buildingType = fsm.data("createBuilding");
            const createArgs = fsm.data("createArgs") || [];
            const buildingId = yield network.request("createBuilding", {
                buildingType,
                x: buildLocation.x,
                y: buildLocation.y,
                resourceType: createArgs[0]
            });
            console.log("Building created", buildingId);
            // Place the building
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
        pointerMove: (tilePos) => __awaiter(void 0, void 0, void 0, function* () {
            const tmpBuilding = ige.$("tmpBuilding");
            if (!tmpBuilding)
                return;
            const startFlag = fsm.data("startFlag");
            const p1 = new IgePoint3d(startFlag._translate.x, startFlag._translate.y);
            if (ige.data("isometric")) {
                p1.thisToIso();
            }
            const p2 = tileMap1.tileToWorld(tilePos.x, tilePos.y);
            tmpBuilding.setLine(p1.x, p1.y, p2.x, p2.y);
        }),
        click: (tilePos, building) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("CREATE ROAD CLICK");
            let destinationFlagId;
            // Check the location and determine if we can build there
            // Check if the end is a flag and if not, create one
            if (!building) {
                // No building exists at the grid location, create a new flag
                destinationFlagId = yield network.request("createBuilding", {
                    buildingType: BuildingType.flag,
                    x: tilePos.x,
                    y: tilePos.y
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
    const onPointerUp = () => {
        const tilePos = tileMap1.mouseToTile();
        // Run a hit test against the all the entities
        const buildings = ige.$$("building");
        const occupiedBy = tileMap1.tileOccupiedBy(tilePos.x, tilePos.y);
        // Loop the buildings and check against the AABB
        // const foundBuilding = buildings.reduce((tmpBuilding: Building | undefined, building) => {
        // 	if (tmpBuilding?.classId !== "FlagBuilding") {
        // 		if (building.triggerPolygon().pointInside(tilePos)) {
        // 			tmpBuilding = building;
        // 		}
        // 	}
        //
        // 	return tmpBuilding;
        // }, undefined);
        if (occupiedBy) {
            console.log("foundBuilding", occupiedBy);
        }
        fsm.raiseEvent("click", tilePos, occupiedBy);
    };
    const onPointerMove = () => {
        const tilePos = tileMap1.mouseToTile();
        fsm.raiseEvent("pointerMove", tilePos);
        // // Run a hit test against the all the entities
        // const buildings = ige.$$("building") as Building[];
        //
        // // Loop the buildings and check against the AABB
        // const foundBuilding = buildings.find((building) => {
        // 	return building.triggerPolygon().pointInside(ige._pointerPos);
        // });
        //
        // if (foundBuilding) {
        // 	console.log("foundBuilding", foundBuilding);
        // }
    };
    const onKeyUp = (evt) => {
        if (evt.code === "Escape") {
            // Cancel the current operation and return to the idle state
            fsm.enterState("idle");
        }
    };
    tileMap1.pointerEventsActive(true);
    //tileMap1.on("pointerUp", onPointerUp);
    //tileMap1.on("pointerMove", onPointerMove);
    ige.input.on("pointerUp", onPointerUp);
    ige.input.on("pointerMove", onPointerMove);
    ige.input.on("keyUp", onKeyUp);
    // ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour", () => {
    //
    // });
    return () => __awaiter(void 0, void 0, void 0, function* () {
        ige.engine.removeBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour");
    });
});
