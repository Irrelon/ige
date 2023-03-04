import {ige} from "../engine/instance";
import IgeBaseClass from "../engine/core/IgeBaseClass";
import IgeBaseScene from "../engine/core/IgeBaseScene";
import IgeEditorComponent from "../engine/components/editor/IgeEditorComponent";
import IgeInputComponent from "../engine/components/IgeInputComponent";
import { Level1 } from "./levels/Level1";
import { textures } from "./services/textures";

// @ts-ignore
window.ige = ige;

export class Client extends IgeBaseClass {
	classId = "Client";

	constructor () {
		// Init the super class
		super();

		ige.addComponent(IgeEditorComponent);
		(ige.components.input as IgeInputComponent).debug(true);

		// Load the game textures
		textures.load();

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', () => {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start((success) => {
				// Check if the engine started successfully
				if (success) {
					// Load the base scene data
					ige.addGraph(IgeBaseScene);

					// Add all the items in Scene1 to the scenegraph
					// (see gameClasses/Scene1.js :: addGraph() to see
					// the method being called by the engine and how
					// the items are added to the scenegraph)
					ige.addGraph(Level1);
				}
			});
		});
	}
}
