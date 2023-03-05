import {ige} from "../engine/instance";
import IgeBaseClass from "../engine/core/IgeBaseClass";
import IgeBaseScene from "../engine/core/IgeBaseScene";
import { Level1 } from "./levels/Level1";
import { textures } from "./services/textures";
import { audioController } from "../engine/services/audioController";
import { IgeOptions } from "../engine/core/IgeOptions";

// @ts-ignore
window.ige = ige;

export class Client extends IgeBaseClass {
	classId = "Client";

	constructor () {
		// Init the super class
		super();

		const options = new IgeOptions();
		options.set("masterVolume", 1);
		ige.init();
		//ige.engine.addComponent(IgeEditorComponent);
		audioController.masterVolume(options.get('masterVolume', 1));
		//(ige.components.input as IgeInputComponent).debug(true);

		// Load the game textures
		textures.load();

		// Wait for our textures to load before continuing
		ige.textures.on('allLoaded', () => {
			// Create the HTML canvas
			ige.engine.createFrontBuffer(true);

			// Start the engine
			ige.engine.start((success) => {
				// Check if the engine started successfully
				if (success) {
					// Load the base scene data
					ige.engine.addGraph(IgeBaseScene);

					// Add all the items in Scene1 to the scenegraph
					// (see gameClasses/Scene1.js :: addGraph() to see
					// the method being called by the engine and how
					// the items are added to the scenegraph)
					ige.engine.addGraph(Level1);
				}
			});
		});
	}
}
