import IgeBaseClass from "../engine/core/IgeBaseClass";
import type { Ige } from "../engine/core/Ige";
import IgeTexture from "../engine/core/IgeTexture";

export class Client extends IgeBaseClass {
	classId = "Client";
	gameTextures: Record<string, IgeTexture>;

	constructor (ige: Ige) {
		super(ige);

		// Load our textures
		this.gameTextures = {};

		// Load a game texture here
		//this.gameTextures.myTexture = new IgeTexture('./assets/somePathToImage.png');

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
		ige.on("texturesLoaded", function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Add base scene data
					ige.addGraph("IgeBaseScene");

					// CREATE SOME ENTITIES AND WHOTNOT HERE
				}
			});
		});
	}
}
