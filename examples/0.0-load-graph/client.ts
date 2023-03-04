import {ige} from "../../engine/instance";
import IgeBaseClass from "../../engine/core/IgeBaseClass";
import IgeBaseScene from "../../engine/core/IgeBaseScene";
import IgeEditorComponent from "../../engine/components/editor/IgeEditorComponent";
import IgeInputComponent from "../../engine/components/IgeInputComponent";
import IgeTexture from "../../engine/core/IgeTexture";
import { Scene1 } from "./levels/Scene1";
import simpleBox from "./assets/textures/smartTextures/simpleBox";

// @ts-ignore
window.ige = ige;

export class Client extends IgeBaseClass {
	classId = "Client";
	gameTexture: Record<string, IgeTexture>;

	constructor () {
		// Init the super class
		super();

		ige.createRoot();
		ige.addComponent(IgeEditorComponent);
		(ige.components.input as IgeInputComponent).debug(true);

		// Load the fairy texture and simpleBox smart texture
		this.gameTexture = {
			fairy: new IgeTexture("./assets/textures/sprites/fairy.png"),
			simpleBox: new IgeTexture(simpleBox)
		};

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);


			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Load the base scene data
					ige.addGraph(IgeBaseScene);

					// Add all the items in Scene1 to the scenegraph
					// (see gameClasses/Scene1.js :: addGraph() to see
					// the method being called by the engine and how
					// the items are added to the scenegraph)
					ige.addGraph(Scene1);
				}
			});
		});
	}
}
