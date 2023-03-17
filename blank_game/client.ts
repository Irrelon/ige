import IgeBaseClass from "../engine/core/IgeBaseClass";
import { ige } from "../engine/instance";

export class Client extends IgeBaseClass {
	classId = "Client";

	constructor () {
		super();
		void this.init();
	}

	async init () {
		// Load a game texture here
		//new IgeTexture("someImageName", './assets/somePathToImage.png');

		///////////////////////////////////////////////////////////////////////////////
		// *** PLEASE READ - BLANK PROJECT RUNNING DETAILS ***
		///////////////////////////////////////////////////////////////////////////////
		// The engine will wait for your textures to load before it starts because
		// of the code below waiting for an "on('texturesLoaded')" before executing.
		// The problem is there are no textures loaded because this is a blank project
		// so if you run this from the index.html the loading symbol will spin forever.
		// I've added an example line (line 16) to show how to load at least one
		// texture into memory, but you'll have to provide an image file for it :)
		///////////////////////////////////////////////////////////////////////////////

		// Wait for our textures to load before continuing
		await ige.textures.whenLoaded();

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start()

		// Add base scene data
		ige.engine.addGraph("IgeBaseScene");

		// CREATE SOME ENTITIES AND WHOTNOT HERE
	}
}
