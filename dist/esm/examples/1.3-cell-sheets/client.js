import { Level1 } from "./levels/Level1.js";
import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js";
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js";
import { IgeCellSheet } from "../../engine/core/IgeCellSheet.js";
import { ige } from "../../engine/instance.js";

// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
	classId = "Client";
	constructor() {
		super();
		void this.init();
	}
	async init() {
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
