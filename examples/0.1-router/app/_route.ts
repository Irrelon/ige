import { ige } from "@/engine/instance";
import { IgeUiManagerComponent } from "@/engine/components/IgeUiManagerComponent";
import { AppScene } from "./AppScene";
import "./splash/_route";
import "./level1/_route";

ige.router.route("app", {
	client: async () => {
		await ige.ready();

		// @ts-ignore
		window.ige = ige;

		ige.engine.addComponent("ui", IgeUiManagerComponent);

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start();

		// Load our level onto the scenegraph
		await ige.engine.addGraph(AppScene);

		return async () => {
			await ige.engine.removeGraph(AppScene);

			await ige.engine.stop();
		}
	}
});
