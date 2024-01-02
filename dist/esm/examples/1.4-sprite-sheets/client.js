import { Level1 } from "./levels/Level1.js";
import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js";
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js";
import { IgeSpriteSheet } from "../../engine/core/IgeSpriteSheet.js";
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
		// Load the sprite sheet texture and store it in the gameTexture array
		new IgeSpriteSheet("sci-fi-tiles1", "../assets/textures/tiles/future-joy-tilee.png", [
			// Format of the sprite bounding rectangle array is x, y, width, height
			[5, 32, 22, 31],
			[128, 101, 96, 52]
		]);
		// Load the sprite sheet and also assign cell ids to each cell
		new IgeSpriteSheet("sci-fi-tiles2", "../assets/textures/tiles/future-joy-tilee.png", [
			// Format of the sprite area is x, y, width, height
			[5, 32, 22, 31, "table"],
			[128, 101, 96, 52, "panel"]
		]);
		// Because the shrubbery image has distinct bounds around each sprite image, we
		// can ask the engine to detect the sprite bounds for us by not providing them
		// so here we load the shrubbery image but do not pass any sprite area data!
		new IgeSpriteSheet("shrubbery", "../assets/textures/tiles/shrubbery.png");
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
