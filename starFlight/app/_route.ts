import { ige } from "@/engine/instance";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeUiManagerComponent } from "@/engine/components/IgeUiManagerComponent";
import {AppClientScene} from "./AppClientScene";
import {AppServerScene} from "./AppServerScene";

import { timerCircle } from "../assets/ui/timerCircle";
import { tab } from "../assets/ui/tab";
import { infoWindow } from "../assets/ui/infoWindow";

//import "./space/_route";
import "./splash/_route";

ige.router.route("app", {
	client: async () => {
		// @ts-ignore
		window.ige = ige;

		ige.engine.addComponent("ui", IgeUiManagerComponent);

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start();

		const textures = [
			new IgeTexture("timerCircle", timerCircle),
			new IgeTexture("infoWindow", infoWindow),
			new IgeTexture("tab", tab)
		];

		// Load our level onto the scenegraph
		await ige.engine.addGraph(AppClientScene);

		return async () => {
			await ige.engine.removeGraph(AppClientScene);
			ige.textures.removeList(textures);

			await ige.engine.stop();
		}
	},
	server: async () => {
		ige.engine.addComponent("ui", IgeUiManagerComponent);

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start();

		// Load our level onto the scenegraph
		await ige.engine.addGraph(AppServerScene);

		return async () => {
			await ige.engine.removeGraph(AppServerScene);
			await ige.engine.stop();
		}
	}
});
