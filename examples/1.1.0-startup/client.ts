import IgeTexture from "../../engine/core/IgeTexture";
import IgeBaseScene from "../../engine/core/IgeBaseScene";
import simpleBox from "./assets/textures/smartTextures/simpleBox";
import IgeBaseClass from "../../engine/core/IgeBaseClass";
import {Rotator} from "./gameClasses/Rotator";
import {ige} from "../../engine/instance";

// @ts-ignore
window.ige = ige;

export class Client extends IgeBaseClass {
	classId = "Client";

	constructor () {
		// Init the super class
		super();

		// Load our textures
		const obj: IgeBaseClass[] = [];

		// Load the fairy texture and simpleBox smart texture
		const gameTexture: Record<string, IgeTexture> = {
			fairy: new IgeTexture("./assets/textures/sprites/fairy.png"),
			simpleBox: new IgeTexture(simpleBox)
		};

		// Wait for our textures to load before continuing
		ige.on("texturesLoaded", function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);
			ige.createRoot();

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Load the base scene data
					ige.addGraph(IgeBaseScene);

					// Create an entity and mount it to the scene
					obj[0] = new Rotator(0.1)
						.id("fairy1")
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture.fairy)
						.translateTo(0, 0, 0)
						.mount(ige.$("baseScene"));

					// Create a second rotator entity and mount
					// it to the first one at 0, 50 relative to the
					// parent
					obj[1] = new Rotator(0.1)
						.id("fairy2")
						.depth(1)
						.width(50)
						.height(50)
						.texture(gameTexture.fairy)
						.translateTo(0, 50, 0)
						.mount(obj[0]);

					// Create a third rotator entity and mount
					// it to the first on at 0, -50 relative to the
					// parent, but assign it a smart texture!
					obj[2] = new Rotator(0.1)
						.id("simpleBox")
						.depth(1)
						.width(50)
						.height(50)
						.texture(gameTexture.simpleBox)
						.translateTo(0, -50, 0)
						.mount(obj[0]);
				}
			});
		});
	}
}
