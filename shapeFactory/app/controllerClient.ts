import { ige } from "@/engine/instance";
import { IgeFSM } from "@/engine/core/IgeFSM";
import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { IgeEffectFunction } from "@/types/IgeRouteDefinition";
import { BuildingType } from "../enums/BuildingType";
import { StorageBuilding } from "../entities/StorageBuilding";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeBehaviourType } from "@/enums/IgeBehaviourType";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeInputDevice, IgeInputPointerMap } from "@/enums/IgeInputDeviceMap";
import { newIdHex } from "@/engine/utils";
import { FactoryBuilding } from "../entities/FactoryBuilding";
import { ResourceType } from "../enums/ResourceType";
import { createFactoryBuilding, createStorageBuilding } from "../services/createBuilding";
import { Line } from "../entities/base/Line";

export const controllerClient: IgeEffectFunction = async () => {
	const uiCreateStorage = ige.$("uiCreateStorage") as IgeUiElement;
	const uiCreateFactory = ige.$("uiCreateFactory") as IgeUiElement;

	const fsm = new IgeFSM();

	fsm.defineState("idle", {
		enter: async () => {
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
		},
		exit: async () => {
			uiCreateStorage.pointerUp(null);
			uiCreateFactory.pointerUp(null);
		}
	});

	fsm.defineState("createBuilding", {
		enter: async () => {
			const buildingType = fsm.data("createBuilding");
			const createArgs = fsm.data("createArgs");
			console.log("Entered createBuilding", buildingType);

			// Get the scene to mount to
			const scene1 = ige.$("scene1") as IgeScene2d;

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
		},
		pointerMove: async () => {
			const tmpBuilding = ige.$("tmpBuilding") as IgeEntity;
			if (!tmpBuilding) return;

			const gridX = Math.round(ige._pointerPos.x / 100) * 100;
			const gridY = Math.round(ige._pointerPos.y / 100) * 100;

			tmpBuilding.translateTo(gridX,gridY, 0);
		},
		click: async () => {
			const gridX = Math.round(ige._pointerPos.x / 100) * 100;
			const gridY = Math.round(ige._pointerPos.y / 100) * 100;

			// Check the location and determine if we can build there

			// Get the scene to mount to
			const scene1 = ige.$("scene1") as IgeScene2d;

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
			const existingTmpBuilding = ige.$("tmpBuilding") as IgeEntity;
			existingTmpBuilding.destroy();

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

	fsm.defineState("createRoad", {
		enter: async () => {
			console.log("Entered createRoad");

			fsm.data("roadStart", null);
			fsm.data("roadEnd", null);

			// Get the scene to mount to
			const scene1 = ige.$("scene1") as IgeScene2d;

			// Remove any existing temp building
			const existingTmpBuilding = ige.$("tmpBuilding");

			if (existingTmpBuilding) {
				existingTmpBuilding.destroy();
			}

			new Line()
				.id("tmpBuilding")
				.mount(scene1);
		},
		pointerMove: async () => {
			const tmpBuilding = ige.$("tmpBuilding") as IgeEntity;
			if (!tmpBuilding) return;

			const gridX = Math.round(ige._pointerPos.x / 100) * 100;
			const gridY = Math.round(ige._pointerPos.y / 100) * 100;

			tmpBuilding.translateTo(gridX,gridY, 0);
		},
		click: async () => {
			const gridX = Math.round(ige._pointerPos.x / 100) * 100;
			const gridY = Math.round(ige._pointerPos.y / 100) * 100;

			// Check the location and determine if we can build there

			if (fsm.data("roadStart") === null) {
				// Set the road start
				fsm.data("roadStart", {x: gridX, y: gridY});
			} else {
				// We have a road start and a road end, create the road
				// TODO: Roads currently need a from and to id of the locations they
				//   connect, however we can't use this model if we want to allow arbitrary
				//   road building. Either we continue to use this and only allow road starts
				//   to be existing flags and road ends to be either an existing flag or create
				//   a flag for the location selected, or we move to a purely grid-based road
				//   system where the path finder uses the grid to calculate paths
			}

			// Place the building
			const existingTmpBuilding = ige.$("tmpBuilding") as IgeEntity;
			existingTmpBuilding.destroy();

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

	ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour", () => {
		if (ige.input.state(IgeInputDevice.pointer1, IgeInputPointerMap.button0)) {
			fsm.raiseEvent("click");
		}

		fsm.raiseEvent("pointerMove");
	});

	return async () => {
		ige.engine.removeBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour");
	}
}
