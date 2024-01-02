import { IgeBaseScene } from "../../../engine/core/IgeBaseScene.js"
import { IgeOptions } from "../../../engine/core/IgeOptions.js"
import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js"
import { ige } from "../../../engine/instance.js"
export class AppServerScene extends IgeSceneGraph {
    classId = "AppServerScene";
    async addGraph() {
        const options = new IgeOptions();
        options.set("masterVolume", 1);
        const network = ige.network;
        // Start the engine
        await ige.engine.start();
        // Load the base scene data
        await ige.engine.addGraph(IgeBaseScene);
        network.sendInterval(30); // Send a stream update once every 30 milliseconds
        await network.start(2000);
        network.acceptConnections(true);
    }
    removeGraph() {
        const network = ige.network;
        network.stop();
        ige.engine.stop();
    }
}
