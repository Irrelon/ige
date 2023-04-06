import { ige } from "@/engine/instance";
import { IgeFSM } from "@/engine/core/IgeFSM";
import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { IgeEffectFunction } from "@/types/IgeRouteDefinition";
import { BuildingType } from "../enums/BuildingType";
import { StorageBuilding } from "../entities/StorageBuilding";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeBehaviourType } from "@/enums/IgeBehaviourType";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { FactoryBuilding } from "../entities/FactoryBuilding";
import { ResourceType } from "../enums/ResourceType";
import { Line } from "../entities/base/Line";
import { Flag } from "../entities/base/Flag";
import { FlagBuilding } from "../entities/FlagBuilding";
import { Building } from "../entities/base/Building";
import { IgeNetIoClientController } from "@/engine/network/client/IgeNetIoClientController";
import { MiningBuilding } from "../entities/MiningBuilding";
import { IgePoint3d } from "@/engine/core/IgePoint3d";

export const controllerClient: IgeEffectFunction = async () => {
	const network = ige.network as IgeNetIoClientController;
	const uiCreateStorage = ige.$("uiCreateStorage") as IgeUiElement;
	const uiCreateFactory = ige.$("uiCreateFactory") as IgeUiElement;
	const uiCreateMine1 = ige.$("uiCreateMine1") as IgeUiElement;
	const uiCreateMine2 = ige.$("uiCreateMine2") as IgeUiElement;
	const uiCreateFlag = ige.$("uiCreateFlag") as IgeUiElement;

	const fsm = new IgeFSM();

	fsm.defineState("idle", {
		enter: async () => {
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
		},
		exit: async () => {
			uiCreateStorage.pointerUp(null);
			uiCreateFactory.pointerUp(null);
		},
		click: async (building?: Building) => {
			if (!building) return;

			if (building.classId === "FlagBuilding") {
				// User clicked on a flag, start road building
				// TODO: Later we should pop an options modal instead with other options
				//  like remove flag?
				await fsm.enterState("createRoad", building);
			}
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

			case BuildingType.mine:
				new MiningBuilding(ResourceType.none, [{type: ResourceType.none, count: 0, max: 0}])
					.id("tmpBuilding")
					.mount(scene1);
				break;

			case BuildingType.flag:
				new FlagBuilding()
					.id("tmpBuilding")
					.mount(scene1);
				break;
			}
		},
		exit: async () => {
			const tmpBuilding = ige.$("tmpBuilding") as IgeEntity;
			if (!tmpBuilding) return;

			// Destroy the tmp building
			tmpBuilding.destroy();
		},
		pointerMove: async () => {
			const tmpBuilding = ige.$("tmpBuilding") as IgeEntity;
			if (!tmpBuilding) return;

			const gridX = Math.round(ige._pointerPos.x / 100) * 100;
			const gridY = Math.round(ige._pointerPos.y / 100) * 100;

			const tr = new IgePoint3d(gridX, gridY);

			if (ige.data("isometric")) {
				tr.thisTo2d();
			}

			tmpBuilding.translateTo(tr.x,tr.y, 0);
		},
		click: async () => {
			const gridX = Math.round(ige._pointerPos.x / 100) * 100;
			const gridY = Math.round(ige._pointerPos.y / 100) * 100;

			// Check the location and determine if we can build there

			// Get the building details
			const buildingType = fsm.data("createBuilding");
			const createArgs = fsm.data("createArgs") || [];

			const tr = new IgePoint3d(gridX, gridY);

			if (ige.data("isometric")) {
				tr.thisTo2d();
			}

			const buildingId = await network.request("createBuilding", {
				buildingType,
				x: tr.x,
				y: tr.y,
				resourceType: [createArgs[0]]
			});

			console.log("Building created", buildingId);

			// Place the building
			const existingTmpBuilding = ige.$("tmpBuilding") as IgeEntity;
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
			const tmpBuilding = ige.$("tmpBuilding") as Line;
			if (!tmpBuilding) return;

			const startFlag = fsm.data("startFlag") as FlagBuilding;

			const gridX = Math.round(ige._pointerPos.x / 100) * 100;
			const gridY = Math.round(ige._pointerPos.y / 100) * 100;

			const p1 = new IgePoint3d(startFlag._translate.x, startFlag._translate.y);

			if (ige.data("isometric")) {
				p1.thisToIso();
			}

			const p2 = new IgePoint3d(gridX, gridY);

			// if (ige.data("isometric")) {
			// 	p2.thisToIso();
			// }

			tmpBuilding.setLine(p1.x, p1.y, p2.x, p2.y);
		},
		click: async (building?: Building) => {
			const scene1 = ige.$("scene1") as IgeScene2d;
			const gridX = Math.round(ige._pointerPos.x / 100) * 100;
			const gridY = Math.round(ige._pointerPos.y / 100) * 100;

			let destinationFlagId: string;

			// Check the location and determine if we can build there

			// Check if the end is a flag and if not, create one
			if (!building) {
				const tr = new IgePoint3d(gridX, gridY);

				if (ige.data("isometric")) {
					tr.thisTo2d();
				}

				// No building exists at the grid location, create a new flag
				destinationFlagId = await network.request("createBuilding", {
					buildingType: BuildingType.flag,
					x: tr.x,
					y: tr.y
				});
			} else if (building.classId === "FlagBuilding") {
				// The clicked end point is a flag, use this
				destinationFlagId = building.id();
			} else {
				// The clicked end point is a building, use it's existing flag
				destinationFlagId = (building.flag as FlagBuilding).id();
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

	const onPointerUp = (evt: PointerEvent, mx: number, my: number, button: number) => {
		// Run a hit test against the all the entities
		const buildings = ige.$$("building") as Building[];

		// Loop the buildings and check against the AABB
		const foundBuilding = buildings.find((building) => {
			return building.triggerPolygon().pointInside(ige._pointerPos);
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
		// 	return building.triggerPolygon().pointInside(ige._pointerPos);
		// });
		//
		// if (foundBuilding) {
		// 	console.log("foundBuilding", foundBuilding);
		// }
	}

	const onKeyUp = (evt: KeyboardEvent) => {
		if (evt.code === "Escape") {
			// Cancel the current operation and return to the idle state
			fsm.enterState("idle");
		}
	}

	ige.input.on("pointerUp", onPointerUp);
	ige.input.on("pointerMove", onPointerMove);
	ige.input.on("keyUp", onKeyUp);


	// ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour", () => {
	//
	// });

	return async () => {
		ige.engine.removeBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour");
	}
}
