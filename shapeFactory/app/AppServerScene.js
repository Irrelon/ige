var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../../engine/instance.js";
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js";
import { IgeOptions } from "../../engine/core/IgeOptions.js";
import { IgeSceneGraph } from "../../engine/core/IgeSceneGraph.js";
export class AppServerScene extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "AppServerScene";
    }
    addGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            const options = new IgeOptions();
            options.set("masterVolume", 1);
            const network = ige.network;
            // Start the engine
            yield ige.engine.start();
            // Load the base scene data
            yield ige.engine.addGraph(IgeBaseScene);
            network.sendInterval(30); // Send a stream update once every 30 milliseconds
            network.define("testRequest", (data, clientId, requestCallback) => {
                requestCallback === null || requestCallback === void 0 ? void 0 : requestCallback(false, "some data");
            });
            yield network.start(2000);
            network.acceptConnections(true);
        });
    }
    removeGraph() {
        const network = ige.network;
        network.stop();
        ige.engine.stop();
    }
}
