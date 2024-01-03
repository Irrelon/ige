import type { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeFSM } from "@/engine/core/IgeFSM";
import type { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import type { IgeTileMap2d } from "@/engine/core/IgeTileMap2d";
import type { IgeUiElement } from "@/engine/core/IgeUiElement";
import { ige } from "@/engine/exports";
import type { IgeNetIoClientController } from "@/engine/network/client/IgeNetIoClientController";
import { BuildingType } from "../enums/BuildingType";
import { ResourceType } from "../enums/ResourceType";
import { IgeBehaviourType } from "@/enums/IgeBehaviourType";
import { FactoryBuilding1 } from "../entities/FactoryBuilding1";
import { FactoryBuilding2 } from "../entities/FactoryBuilding2";
import { FlagBuilding } from "../entities/FlagBuilding";
import { HouseBuilding1 } from "../entities/HouseBuilding1";
import { MiningBuilding } from "../entities/MiningBuilding";
import { StorageBuilding } from "../entities/StorageBuilding";
import type { Building } from "../entities/base/Building";
import type { Flag } from "../entities/base/Flag";
import { Line } from "../entities/base/Line";
import type { IgeEffectFunction } from "@/types/IgeRouteDefinition";

export const controllerClient: IgeEffectFunction = async () => {
	const network = ige.network as IgeNetIoClientController;

	// TODO Turn this into a loop and use data on the items to handle functionality
	const uiCreateStorage = ige.$("uiCreateStorage") as IgeUiElement;
	const uiCreateFactory1 = ige.$("uiCreateFactory1") as IgeUiElement;
	const uiCreateFactory2 = ige.$("uiCreateFactory2") as IgeUiElement;
	const uiCreateMine1 = ige.$("uiCreateMine1") as IgeUiElement;
	const uiCreateMine2 = ige.$("uiCreateMine2") as IgeUiElement;
	const uiCreateHouse1 = ige.$("uiCreateHouse1") as IgeUiElement;

	const fsm = new IgeFSM();
	const tileMap1 = ige.$("tileMap1") as IgeTileMap2d;

	fsm.defineState("idle", {
		enter: async () => {
			console.log("Entered idle");

			uiCreateFactory1.pointerUp(() => {
				fsm.data("createBuilding", BuildingType.factory1);
				fsm.data("createArgs", [
					ResourceType.energy,
					[
						{
							type: ResourceType.elerium,
							count: 1,
							max: 3
						},
						{
							type: ResourceType.uranium,
							count: 1,
							max: 3
						}
					]
				]);
				fsm.enterState("createBuilding");
			});

			uiCreateFactory2.pointerUp(() => {
				fsm.data("createBuilding", BuildingType.factory2);
				fsm.data("createArgs", [
					ResourceType.energy,
					[
						{
							type: ResourceType.energy,
							count: 1,
							max: 3
						},
						{
							type: ResourceType.elerium,
							count: 1,
							max: 3
						},
						{
							type: ResourceType.uranium,
							count: 1,
							max: 3
						}
					]
				]);
				fsm.enterState("createBuilding");
			});

			uiCreateStorage.pointerUp(() => {
				fsm.data("createBuilding", BuildingType.storage);
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

			uiCreateHouse1.pointerUp(() => {
				fsm.data("createBuilding", BuildingType.house1);
				fsm.data("createArgs", [ResourceType.science, ResourceType.energy]);
				fsm.enterState("createBuilding");
			});
		},
		exit: async () => {
			uiCreateStorage.pointerUp(null);
			uiCreateFactory1.pointerUp(null);
		},
		click: async (mousePos: IgePoint2d, building?: Building) => {
			console.log("IDLE CLICK");
			if (!building) return;

			//if (building.classId === "FlagBuilding") {
			// User clicked on a flag, start road building
			// TODO: Later we should pop an options modal instead with other options
			//  like remove flag?
			await fsm.enterState("createRoad", building);
			//}
		}
	});

	fsm.defineState("createBuilding", {
		enter: async () => {
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
				new StorageBuilding().id("tmpBuilding").mount(tileMap1);
				break;

			case BuildingType.factory1:
				new FactoryBuilding1(NaN, NaN, createArgs[0], createArgs[1]).id("tmpBuilding").mount(tileMap1);
				break;

			case BuildingType.factory2:
				new FactoryBuilding2(NaN, NaN, createArgs[0], createArgs[1]).id("tmpBuilding").mount(tileMap1);
				break;

			case BuildingType.mine:
				new MiningBuilding(NaN, NaN, ResourceType.none, []).id("tmpBuilding").mount(tileMap1);
				break;

			case BuildingType.house1:
				new HouseBuilding1(NaN, NaN, ResourceType.none, []).id("tmpBuilding").mount(tileMap1);
				break;

			case BuildingType.flag:
				new FlagBuilding().id("tmpBuilding").mount(tileMap1);
				break;
			}
		},
		exit: async () => {
			const tmpBuilding = ige.$("tmpBuilding") as Building;
			if (!tmpBuilding) return;

			// Destroy the tmp building
			tmpBuilding.destroy();
		},
		pointerMove: async (tilePos: IgePoint2d) => {
			const tmpBuilding = ige.$("tmpBuilding") as Building;
			if (!tmpBuilding) return;

			// Check if the building is allowed to occupy this area
			if (
				tileMap1.isTileOccupied(
					tilePos.x + tmpBuilding.tileXDelta,
					tilePos.y + tmpBuilding.tileYDelta,
					tmpBuilding.tileW,
					tmpBuilding.tileH
				)
			)
				return;

			tmpBuilding.translateToTile(tilePos.x, tilePos.y, 0);
		},
		click: async (tilePos: IgePoint2d) => {
			console.log("CREATE BUILDING CLICK");

			const existingTmpBuilding = ige.$("tmpBuilding") as Building;
			const buildLocation = tileMap1.pointToTile(existingTmpBuilding._translate);

			// Check the location and determine if we can build there

			// Get the building details
			const buildingType = fsm.data("createBuilding");
			const createArgs = fsm.data("createArgs") || [];

			const buildingId = await network.request("createBuilding", {
				buildingType,
				x: buildLocation.x,
				y: buildLocation.y,
				resourceType: createArgs[0]
			});

			console.log("Building created", buildingId);

			// Place the building
			existingTmpBuilding.destroy();

			// Enter back into idle state
			await fsm.enterState("idle");
		}
	});

	fsm.defineState("createRoad", {
		enter: async (startFlag: Flag) => {
			if (!startFlag) {
				throw new Error("Flag building was not passed when entering createRoad state!");
			}
			console.log("Entered createRoad");

			fsm.data("startFlag", startFlag);

			// Remove any existing temp building
			const existingTmpBuilding = ige.$("tmpBuilding");

			if (existingTmpBuilding) {
				existingTmpBuilding.destroy();
			}

			new Line().id("tmpBuilding").mount(tileMap1);
		},
		pointerMove: async (tilePos: IgePoint2d) => {
			const tmpBuilding = ige.$("tmpBuilding") as Line;
			if (!tmpBuilding) return;

			const startFlag = fsm.data("startFlag") as FlagBuilding;

			const p1 = new IgePoint3d(startFlag._translate.x, startFlag._translate.y);

			if (ige.data("isometric")) {
				p1.thisToIso();
			}

			const p2 = tileMap1.tileToWorld(tilePos.x, tilePos.y);

			tmpBuilding.setLine(p1.x, p1.y, p2.x, p2.y);
		},
		click: async (tilePos: IgePoint2d, building?: Building) => {
			console.log("CREATE ROAD CLICK");

			let destinationFlagId: string;

			// Check the location and determine if we can build there

			// Check if the end is a flag and if not, create one
			if (!building) {
				// No building exists at the grid location, create a new flag
				destinationFlagId = await network.request("createBuilding", {
					buildingType: BuildingType.flag,
					x: tilePos.x,
					y: tilePos.y
				});
			} else {
				// The clicked end point is a flag, use this
				destinationFlagId = building.id();
			}

			// Place the building
			const existingTmpBuilding = ige.$("tmpBuilding") as IgeEntity;
			existingTmpBuilding.destroy();

			// Create the new connecting road
			const startFlag = fsm.data("startFlag") as FlagBuilding;
			await network.request("createRoad", {
				fromId: startFlag.id(),
				toId: destinationFlagId
			});

			// Enter back into idle state
			await fsm.enterState("idle");
		},
		exit: async () => {
			const tmpBuilding = ige.$("tmpBuilding") as IgeEntity;
			if (!tmpBuilding) return;

			// Destroy the tmp building
			tmpBuilding.destroy();
		}
	});
	fsm.defineState("destroyObject");

	await fsm.initialState("idle");

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

	const onKeyUp = (evt: KeyboardEvent) => {
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

	return async () => {
		ige.engine.removeBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour");
	};
};
