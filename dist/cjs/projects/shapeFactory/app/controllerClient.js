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
exports.controllerClient = void 0;
const IgeFSM_1 = require("../../../engine/core/IgeFSM.js");
const IgePoint3d_1 = require("../../../engine/core/IgePoint3d.js");
const instance_1 = require("../../../engine/instance.js");
const BuildingType_1 = require("../enums/BuildingType");
const ResourceType_1 = require("../enums/ResourceType");
const IgeBehaviourType_1 = require("../../../enums/IgeBehaviourType.js");
const FactoryBuilding1_1 = require("../entities/FactoryBuilding1");
const FactoryBuilding2_1 = require("../entities/FactoryBuilding2");
const FlagBuilding_1 = require("../entities/FlagBuilding");
const HouseBuilding1_1 = require("../entities/HouseBuilding1");
const MiningBuilding_1 = require("../entities/MiningBuilding");
const StorageBuilding_1 = require("../entities/StorageBuilding");
const Line_1 = require("../entities/base/Line");
const controllerClient = () => __awaiter(void 0, void 0, void 0, function* () {
    const network = instance_1.ige.network;
    // TODO Turn this into a loop and use data on the items to handle functionality
    const uiCreateStorage = instance_1.ige.$("uiCreateStorage");
    const uiCreateFactory1 = instance_1.ige.$("uiCreateFactory1");
    const uiCreateFactory2 = instance_1.ige.$("uiCreateFactory2");
    const uiCreateMine1 = instance_1.ige.$("uiCreateMine1");
    const uiCreateMine2 = instance_1.ige.$("uiCreateMine2");
    const uiCreateHouse1 = instance_1.ige.$("uiCreateHouse1");
    const fsm = new IgeFSM_1.IgeFSM();
    const tileMap1 = instance_1.ige.$("tileMap1");
    fsm.defineState("idle", {
        enter: () => __awaiter(void 0, void 0, void 0, function* () {
            console.log("Entered idle");
            uiCreateFactory1.pointerUp(() => {
                fsm.data("createBuilding", BuildingType_1.BuildingType.factory1);
                fsm.data("createArgs", [
                    ResourceType_1.ResourceType.energy,
                    [
                        {
                            type: ResourceType_1.ResourceType.elerium,
                            count: 1,
                            max: 3
                        },
                        {
                            type: ResourceType_1.ResourceType.uranium,
                            count: 1,
                            max: 3
                        }
                    ]
                ]);
                fsm.enterState("createBuilding");
            });
            uiCreateFactory2.pointerUp(() => {
                fsm.data("createBuilding", BuildingType_1.BuildingType.factory2);
                fsm.data("createArgs", [
                    ResourceType_1.ResourceType.energy,
                    [
                        {
                            type: ResourceType_1.ResourceType.energy,
                            count: 1,
                            max: 3
                        },
                        {
                            type: ResourceType_1.ResourceType.elerium,
                            count: 1,
                            max: 3
                        },
                        {
                            type: ResourceType_1.ResourceType.uranium,
                            count: 1,
                            max: 3
                        }
                    ]
                ]);
                fsm.enterState("createBuilding");
            });
            uiCreateStorage.pointerUp(() => {
                fsm.data("createBuilding", BuildingType_1.BuildingType.storage);
                fsm.enterState("createBuilding");
            });
            uiCreateMine1.pointerUp(() => {
                fsm.data("createBuilding", BuildingType_1.BuildingType.mine);
                fsm.data("createArgs", [ResourceType_1.ResourceType.elerium]);
                fsm.enterState("createBuilding");
            });
            uiCreateMine2.pointerUp(() => {
                fsm.data("createBuilding", BuildingType_1.BuildingType.mine);
                fsm.data("createArgs", [ResourceType_1.ResourceType.uranium]);
                fsm.enterState("createBuilding");
            });
            uiCreateHouse1.pointerUp(() => {
                fsm.data("createBuilding", BuildingType_1.BuildingType.house1);
                fsm.data("createArgs", [ResourceType_1.ResourceType.science, ResourceType_1.ResourceType.energy]);
                fsm.enterState("createBuilding");
            });
        }),
        exit: () => __awaiter(void 0, void 0, void 0, function* () {
            uiCreateStorage.pointerUp(null);
            uiCreateFactory1.pointerUp(null);
        }),
        click: (mousePos, building) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("IDLE CLICK");
            if (!building)
                return;
            //if (building.classId === "FlagBuilding") {
            // User clicked on a flag, start road building
            // TODO: Later we should pop an options modal instead with other options
            //  like remove flag?
            yield fsm.enterState("createRoad", building);
            //}
        })
    });
    fsm.defineState("createBuilding", {
        enter: () => __awaiter(void 0, void 0, void 0, function* () {
            const buildingType = fsm.data("createBuilding");
            const createArgs = fsm.data("createArgs");
            console.log("Entered createBuilding", buildingType);
            // Remove any existing temp building
            const existingTmpBuilding = instance_1.ige.$("tmpBuilding");
            if (existingTmpBuilding) {
                existingTmpBuilding.destroy();
            }
            // Set the temporary cursor-following building
            switch (buildingType) {
                case BuildingType_1.BuildingType.storage:
                    new StorageBuilding_1.StorageBuilding().id("tmpBuilding").mount(tileMap1);
                    break;
                case BuildingType_1.BuildingType.factory1:
                    new FactoryBuilding1_1.FactoryBuilding1(NaN, NaN, createArgs[0], createArgs[1]).id("tmpBuilding").mount(tileMap1);
                    break;
                case BuildingType_1.BuildingType.factory2:
                    new FactoryBuilding2_1.FactoryBuilding2(NaN, NaN, createArgs[0], createArgs[1]).id("tmpBuilding").mount(tileMap1);
                    break;
                case BuildingType_1.BuildingType.mine:
                    new MiningBuilding_1.MiningBuilding(NaN, NaN, ResourceType_1.ResourceType.none, []).id("tmpBuilding").mount(tileMap1);
                    break;
                case BuildingType_1.BuildingType.house1:
                    new HouseBuilding1_1.HouseBuilding1(NaN, NaN, ResourceType_1.ResourceType.none, []).id("tmpBuilding").mount(tileMap1);
                    break;
                case BuildingType_1.BuildingType.flag:
                    new FlagBuilding_1.FlagBuilding().id("tmpBuilding").mount(tileMap1);
                    break;
            }
        }),
        exit: () => __awaiter(void 0, void 0, void 0, function* () {
            const tmpBuilding = instance_1.ige.$("tmpBuilding");
            if (!tmpBuilding)
                return;
            // Destroy the tmp building
            tmpBuilding.destroy();
        }),
        pointerMove: (tilePos) => __awaiter(void 0, void 0, void 0, function* () {
            const tmpBuilding = instance_1.ige.$("tmpBuilding");
            if (!tmpBuilding)
                return;
            // Check if the building is allowed to occupy this area
            if (tileMap1.isTileOccupied(tilePos.x + tmpBuilding.tileXDelta, tilePos.y + tmpBuilding.tileYDelta, tmpBuilding.tileW, tmpBuilding.tileH))
                return;
            tmpBuilding.translateToTile(tilePos.x, tilePos.y, 0);
        }),
        click: (tilePos) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("CREATE BUILDING CLICK");
            const existingTmpBuilding = instance_1.ige.$("tmpBuilding");
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
            // Remove any existing temp building
            const existingTmpBuilding = instance_1.ige.$("tmpBuilding");
            if (existingTmpBuilding) {
                existingTmpBuilding.destroy();
            }
            new Line_1.Line().id("tmpBuilding").mount(tileMap1);
        }),
        pointerMove: (tilePos) => __awaiter(void 0, void 0, void 0, function* () {
            const tmpBuilding = instance_1.ige.$("tmpBuilding");
            if (!tmpBuilding)
                return;
            const startFlag = fsm.data("startFlag");
            const p1 = new IgePoint3d_1.IgePoint3d(startFlag._translate.x, startFlag._translate.y);
            if (instance_1.ige.data("isometric")) {
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
                    buildingType: BuildingType_1.BuildingType.flag,
                    x: tilePos.x,
                    y: tilePos.y
                });
            }
            else {
                // The clicked end point is a flag, use this
                destinationFlagId = building.id();
            }
            // Place the building
            const existingTmpBuilding = instance_1.ige.$("tmpBuilding");
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
            const tmpBuilding = instance_1.ige.$("tmpBuilding");
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
        const occupiedBy = tileMap1.tileOccupiedBy(tilePos.x, tilePos.y);
        if (occupiedBy) {
            console.log("foundBuilding", occupiedBy);
        }
        fsm.raiseEvent("click", tilePos, occupiedBy);
    };
    const onPointerMove = () => {
        const tilePos = tileMap1.mouseToTile();
        fsm.raiseEvent("pointerMove", tilePos);
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
    instance_1.ige.input.on("pointerUp", onPointerUp);
    instance_1.ige.input.on("pointerMove", onPointerMove);
    instance_1.ige.input.on("keyUp", onKeyUp);
    // ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour", () => {
    //
    // });
    return () => __awaiter(void 0, void 0, void 0, function* () {
        instance_1.ige.engine.removeBehaviour(IgeBehaviourType_1.IgeBehaviourType.preUpdate, "tmpBuildingBehaviour");
    });
});
exports.controllerClient = controllerClient;
