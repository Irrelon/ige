import {ige} from "@/engine/instance";
import { Level1 } from "./levels/Level1";
import { IgeNetIoServerComponent } from "@/engine/components/network/server/IgeNetIoServerComponent";
import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeBaseScene } from "@/engine/core/IgeBaseScene";
import { IgeOptions } from "@/engine/core/IgeOptions";

export class Server extends IgeBaseClass {
	classId = "Server";

	constructor () {
		// Init the super class
		super();
		void this.init();
	}

	async init () {
		const options = new IgeOptions();
		options.set("masterVolume", 1);
		ige.init();

		const network = (ige.network as IgeNetIoServerComponent);

		// Start the engine
		await ige.engine.start();

		// Load the base scene data
		ige.engine.addGraph(IgeBaseScene);

		// Add all the items in Scene1 to the scenegraph
		// (see gameClasses/Scene1.js :: addGraph() to see
		// the method being called by the engine and how
		// the items are added to the scenegraph)
		ige.engine.addGraph(Level1);

		network.sendInterval(30); // Send a stream update once every 30 milliseconds

		network.define("testRequest", (data, clientId, requestCallback) => {
			requestCallback?.(false, "some data");
		});

		network.start(2000, () => {
			network.acceptConnections(true);
		});
	}
}
