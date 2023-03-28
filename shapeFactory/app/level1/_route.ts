import { ige } from "@/engine/instance";
import { Level1 } from "./Level1";
import { UiClientScene } from "./UiClientScene";
import { IgeUiElement } from "@/engine/core/IgeUiElement";
import IgeFSM from "@/engine/core/IgeFSM";

ige.router.route("app/level1", {
	client: async () => {
		// Add all the items in Scene1 to the scenegraph
		// (see gameClasses/Scene1.js :: addGraph() to see
		// the method being called by the engine and how
		// the items are added to the scenegraph)
		await ige.engine.addGraph(Level1);
		await ige.engine.addGraph(UiClientScene);

		const fsm = new IgeFSM();

		fsm.defineState("idle", {
			enter: async () => {
				console.log("Entered idle");
				const uiCreateStorage = ige.$("uiCreateStorage") as IgeUiElement;

				uiCreateStorage.pointerUp(() => {
					fsm.enterState("createBuilding", "storage");
				});
			}
		});

		fsm.defineState("createBuilding", {
			enter: async (buildingType: string) => {
				console.log("Entered createBuilding", buildingType);
			}
		});

		fsm.defineState("createRoad");
		fsm.defineState("destroyObject");

		await fsm.initialState("idle");

		return async () => {
			await ige.engine.removeGraph(UiClientScene);
			await ige.engine.removeGraph(Level1);
		}
	},
	server: async () => {
		await ige.engine.addGraph(Level1);

		return async () => {
			await ige.engine.removeGraph(Level1);
		}
	}
});
