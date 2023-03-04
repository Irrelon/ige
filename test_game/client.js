import { ige } from "../engine/instance.js";
import IgeBaseClass from "../engine/core/IgeBaseClass.js";
import IgeBaseScene from "../engine/core/IgeBaseScene.js";
import IgeEditorComponent from "../engine/components/editor/IgeEditorComponent.js";
import { Level1 } from "./levels/Level1.js";
import { textures } from "./services/textures.js";
// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
    constructor() {
        // Init the super class
        super();
        this.classId = "Client";
        ige.addComponent(IgeEditorComponent);
        ige.components.input.debug(true);
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
