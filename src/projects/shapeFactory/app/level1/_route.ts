import { Level1 } from "./Level1";
import { UiClientScene } from "./UiClientScene";
import { ige } from "@/engine/instance";
import { controllerClient } from "../controllerClient";
import { controllerServer } from "../controllerServer";

ige.router.route("app/level1", {
	client: async () => {
		// Add all the items in Scene1 to the scenegraph
		// (see gameClasses/Scene1.js :: addGraph() to see
		// the method being called by the engine and how
		// the items are added to the scenegraph)
		await ige.engine.addGraph(Level1);
		await ige.engine.addGraph(UiClientScene);
		const onControllerUnload = await controllerClient();

		return async () => {
			await onControllerUnload();
			await ige.engine.removeGraph(UiClientScene);
			await ige.engine.removeGraph(Level1);
		};
	},
	server: async () => {
		await ige.engine.addGraph(Level1);
		const onControllerUnload = await controllerServer();

		return async () => {
			await onControllerUnload();
			await ige.engine.removeGraph(Level1);
		};
	}
});
