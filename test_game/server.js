var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../engine/instance.js";
import { IgeBaseClass } from "../engine/core/IgeBaseClass.js";
import { IgeBaseScene } from "../engine/core/IgeBaseScene.js";
import { Level1 } from "./levels/Level1.js";
import { IgeOptions } from "../engine/core/IgeOptions.js";
export class Server extends IgeBaseClass {
    constructor() {
        // Init the super class
        super();
        this.classId = "Server";
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const options = new IgeOptions();
            options.set("masterVolume", 1);
            ige.init();
            const network = ige.network;
            // Start the engine
            yield ige.engine.start();
            // Load the base scene data
            ige.engine.addGraph(IgeBaseScene);
            // Add all the items in Scene1 to the scenegraph
            // (see gameClasses/Scene1.js :: addGraph() to see
            // the method being called by the engine and how
            // the items are added to the scenegraph)
            ige.engine.addGraph(Level1);
            network.sendInterval(30); // Send a stream update once every 30 milliseconds
            network.define("testRequest", (data, clientId, requestCallback) => {
                requestCallback === null || requestCallback === void 0 ? void 0 : requestCallback(false, "some data");
            });
            network.start(2000, () => {
                network.acceptConnections(true);
            });
        });
    }
}
