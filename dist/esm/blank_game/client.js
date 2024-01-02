import { IgeBaseClass } from "../engine/core/IgeBaseClass.js";
import { IgeBaseScene } from "../engine/core/IgeBaseScene.js";
import { ige } from "../engine/instance.js";

export class Client extends IgeBaseClass {
	classId = "Client";
	constructor() {
		super();
		void this.init();
	}
	async init() {
		// Load a game texture here
		//new IgeTexture("someImageName", './assets/somePathToImage.png');
		// Wait for our textures to load before continuing
		await ige.textures.whenLoaded();
		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);
		// Start the engine
		await ige.engine.start();
		// Add base scene data
		ige.engine.addGraph(IgeBaseScene);
		// CREATE SOME ENTITIES AND WHOTNOT HERE
	}
}
