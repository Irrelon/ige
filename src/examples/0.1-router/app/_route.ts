import { AppScene } from "./AppScene";
import "./level1/_route";
import "./splash/_route";
import { ige } from "@/engine/instance";

ige.router.route("app", {
	client: async () => {
		await ige.isReady();

		// @ts-ignore
		window.ige = ige;

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start();

		// Load our level onto the scenegraph
		await ige.engine.addGraph(AppScene);

		return async () => {
			await ige.engine.removeGraph(AppScene);

			await ige.engine.stop();
		};
	}
});
