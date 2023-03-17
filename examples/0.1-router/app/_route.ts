import { ige } from "../../../engine/instance";
import IgeBaseScene from "../../../engine/core/IgeBaseScene";
import "./splash/_route";
import "./level1/_route";
import IgeUiManagerComponent from "../../../engine/components/IgeUiManagerComponent";

ige.router.route("app", {
	client: async () => {
		// @ts-ignore
		window.ige = ige;

		ige.engine.addComponent("ui", IgeUiManagerComponent);

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start();

		// Creates "baseScene" and adds a viewport
		ige.engine.addGraph(IgeBaseScene);

		return async () => {
			// Removes the IgeBaseScene from the scenegraph
			debugger;
			ige.engine.removeGraph(IgeBaseScene);

			await ige.engine.stop();
		}
	}
});
