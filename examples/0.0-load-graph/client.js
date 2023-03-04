import IgeTexture from "../../engine/core/IgeTexture.js";
import IgeBaseScene from "../../engine/core/IgeBaseScene.js";
import simpleBox from "./assets/textures/smartTextures/simpleBox.js";
import IgeBaseClass from "../../engine/core/IgeBaseClass.js";
import { ige } from "../../engine/instance.js";
import { Scene1 } from "./levels/Scene1.js";
import IgeEditorComponent from "../../engine/components/editor/IgeEditorComponent.js";
// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
    constructor() {
        // Init the super class
        super();
        this.classId = "Client";
        ige.createRoot();
        ige.addComponent(IgeEditorComponent);
        ige.components.input.debug(true);
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
