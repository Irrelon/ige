import { ige } from "../engine/instance.js";
import IgeBaseClass from "../engine/core/IgeBaseClass.js";
import IgeBaseScene from "../engine/core/IgeBaseScene.js";
import { Level1 } from "./levels/Level1.js";
import { IgeOptions } from "../engine/core/IgeOptions.js";
export class Server extends IgeBaseClass {
    constructor() {
        // Init the super class
        super();
        this.classId = "Server";
        const options = new IgeOptions();
        options.set("masterVolume", 1);
        ige.init();
        //ige.engine.addComponent(IgeEditorComponent);
        //(ige.components.input as IgeInputComponent).debug(true);
        // Start the engine
        ige.engine.start((success) => {
            var _a;
            // Check if the engine started successfully
            if (success) {
                // Load the base scene data
                ige.engine.addGraph(IgeBaseScene);
                // Add all the items in Scene1 to the scenegraph
                // (see gameClasses/Scene1.js :: addGraph() to see
                // the method being called by the engine and how
                // the items are added to the scenegraph)
                ige.engine.addGraph(Level1);
                (_a = ige.network) === null || _a === void 0 ? void 0 : _a.start(2000, () => {
                    ige.network.acceptConnections(true);
                });
            }
        });
    }
}
