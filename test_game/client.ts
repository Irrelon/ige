import {ige} from "../engine/instance";
import IgeBaseClass from "../engine/core/IgeBaseClass";
import IgeBaseScene from "../engine/core/IgeBaseScene";
import { IgeOptions } from "../engine/core/IgeOptions";
import { IgeNetIoClientComponent } from "../engine/components/network/net.io/IgeNetIoClientComponent";
import { Level1 } from "./levels/Level1";
import IgeTexture from "../engine/core/IgeTexture";
import square from "./assets/textures/smartTextures/square";
import line from "./assets/textures/smartTextures/line";
import triangle from "./assets/textures/smartTextures/triangle";
import circle from "./assets/textures/smartTextures/circle";
import star from "./assets/textures/smartTextures/star";

// @ts-ignore
window.ige = ige;

export class Client extends IgeBaseClass {
	classId = "Client";

	constructor () {
		// Init the super class
		super();
		void this.init();
	}

	async init () {
		const options = new IgeOptions();
		options.set("masterVolume", 1);
		ige.init();

		new IgeTexture("fairy", "./assets/textures/sprites/fairy.png");
		new IgeTexture("square", square);
		new IgeTexture("line", line);
		new IgeTexture("triangle", triangle);
		new IgeTexture("circle", circle);
		new IgeTexture("star", star);

		const network = (ige.network as IgeNetIoClientComponent);

		ige.audio?.masterVolume(options.get('masterVolume', 1));

		// Wait for our textures to load before continuing
		await ige.textures.whenLoaded();

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start();
		
		// Load the base scene data
		ige.engine.addGraph(IgeBaseScene);

		// Add all the items in Scene1 to the scenegraph
		// (see gameClasses/Scene1.js :: addGraph() to see
		// the method being called by the engine and how
		// the items are added to the scenegraph)
		ige.engine.addGraph(Level1);

		ige.engine.currentViewport()?.drawBounds(true);

		network.start('http://localhost:2000', () => {
			// network.send("testRequest", "foo", (err, data) => {
			// 	console.log("testRequest response", err, data);
			// });
		});
	}
}
