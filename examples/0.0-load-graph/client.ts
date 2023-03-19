import {ige} from "@/engine/instance";
import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeTexture } from "@/engine/core/IgeTexture";
import simpleBox from "./assets/textures/smartTextures/simpleBox";
import { IgeCanInit } from "@/types/IgeCanInit";
import { IgeBaseScene } from "@/engine/core/IgeBaseScene";
import { Level1 } from "./levels/Level1";

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
