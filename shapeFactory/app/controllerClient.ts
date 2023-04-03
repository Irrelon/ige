import { ige } from "@/engine/instance";
import { IgeFSM } from "@/engine/core/IgeFSM";
import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { IgeEffectFunction } from "@/types/IgeRouteDefinition";
import { BuildingType } from "../enums/BuildingType";
import { StorageBuilding } from "../entities/StorageBuilding";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeBehaviourType } from "@/enums/IgeBehaviourType";
import { IgeEntity } from "@/engine/core/IgeEntity";

export const controllerClient: IgeEffectFunction = async () => {
	const fsm = new IgeFSM();

	ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "tmpBuildingBehaviour", () => {
		const tmpBuilding = ige.$("tmpBuilding") as IgeEntity;
		if (!tmpBuilding) return;

		const gridX = Math.round(ige._pointerPos.x / 100) * 100;
		const gridY = Math.round(ige._pointerPos.y / 100) * 100;

		tmpBuilding.translateTo(gridX,gridY, 0);
	});

	fsm.defineState("idle", {
		enter: async () => {
			console.log("Entered idle");
			const uiCreateStorage = ige.$("uiCreateStorage") as IgeUiElement;

			uiCreateStorage.pointerUp(() => {
				fsm.enterState("createBuilding", BuildingType.storage);
			});
		}
	});

	fsm.defineState("createBuilding", {
		enter: async (buildingType: BuildingType) => {
			console.log("Entered createBuilding", buildingType);

			// Get the scene to mount to
			const scene1 = ige.$("scene1") as IgeScene2d;

			// Remove any existing temp building
			const existingTmpBuilding = ige.$("tempBuilding");

			if (existingTmpBuilding) {
				existingTmpBuilding.destroy();
			}

			// Set the temporary cursor-following building
			let tmpBuilding;

			switch (buildingType) {
			case BuildingType.storage:
				tmpBuilding = new StorageBuilding()
					.id("tmpBuilding")
					.mount(scene1);
				break;
			}
		}
	});

	fsm.defineState("createRoad");
	fsm.defineState("destroyObject");

	await fsm.initialState("idle");

	return async () => {

	}
}
