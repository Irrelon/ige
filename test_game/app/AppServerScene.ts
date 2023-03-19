import {ige} from "@/engine/instance";
import { IgeNetIoServerController } from "@/engine/components/network/server/IgeNetIoServerController";
import { IgeBaseScene } from "@/engine/core/IgeBaseScene";
import { IgeOptions } from "@/engine/core/IgeOptions";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";

export class AppServerScene extends IgeSceneGraph {
	classId = "AppServerScene";

	async addGraph () {
		const options = new IgeOptions();
		options.set("masterVolume", 1);

		const network = (ige.network as IgeNetIoServerController);

		// Start the engine
		await ige.engine.start();

		// Load the base scene data
		await ige.engine.addGraph(IgeBaseScene);

		network.sendInterval(30); // Send a stream update once every 30 milliseconds

		network.define("testRequest", (data, clientId, requestCallback) => {
			requestCallback?.(false, "some data");
		});

		await network.start(2000);
		network.acceptConnections(true);
	}

	removeGraph () {
		const network = (ige.network as IgeNetIoServerController);
		network.stop();
		ige.engine.stop();
	}
}
