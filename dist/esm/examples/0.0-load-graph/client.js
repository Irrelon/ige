import simpleBox from "./assets/textures/smartTextures/simpleBox.js";
import { Level1 } from "./levels/Level1.js";
import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js";
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js";
import { IgeTexture } from "../../engine/core/IgeTexture.js";
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
		new IgeTexture("fairy", "./assets/textures/sprites/fairy.png");
		new IgeTexture("simpleBox", simpleBox);
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
