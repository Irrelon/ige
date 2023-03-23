import { ige } from "@/engine/instance";
import { IgeTexture } from "@/engine/core/IgeTexture";
import {AppClientScene} from "./AppClientScene";
import {AppServerScene} from "./AppServerScene";

import { tab } from "../assets/ui/tab";
import { timerCircle } from "../assets/ui/timerCircle";
import { infoWindow } from "../assets/ui/infoWindow";

import "./space/_route";
import "./splash/_route";

ige.router.route("app", {
	client: async () => {
		// @ts-ignore
		window.ige = ige;

		await ige.isReady();

		const textures = [
			new IgeTexture("timerCircle", timerCircle),
			new IgeTexture("infoWindow", infoWindow),
			new IgeTexture("tab", tab)
		];

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start();

		// Load our level onto the scenegraph
		await ige.engine.addGraph(AppClientScene);

		return async () => {
			await ige.engine.removeGraph(AppClientScene);
			ige.textures.removeList(textures);

			await ige.engine.stop();
		}
	},
	server: async () => {
		await ige.isReady();

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
