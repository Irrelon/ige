import { Level1 } from "./levels/Level1";
import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeBaseScene } from "@/engine/core/IgeBaseScene";
import { IgeCellSheet } from "@/engine/core/IgeCellSheet";
import { ige } from "@/engine/exports";
import type { IgeCanInit } from "@/types/IgeCanInit";

// @ts-ignore
window.ige = ige;

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";

	constructor () {
		super();
		void this.init();
	}

	async init () {
		// Load the game textures
		new IgeCellSheet("grassSheet", "../assets/textures/tiles/grassSheet.png", 4, 1);

		// Wait for our textures to load before continuing
		await ige.textures.whenLoaded();

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start();

		// Creates "baseScene" and adds a viewport
		ige.engine.addGraph(IgeBaseScene);

		// Load our level onto the scenegraph
		ige.engine.addGraph(Level1);
	}
}
