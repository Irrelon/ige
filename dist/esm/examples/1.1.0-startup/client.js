import simpleBox from "./assets/textures/smartTextures/simpleBox.js"
import { Rotator } from "./gameClasses/Rotator.js"
import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js"
import { IgeTexture } from "../../engine/core/IgeTexture.js"
import { ige } from "../../engine/instance.js"
// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
    classId = "Client";
    constructor() {
        // Init the super class
        super();
        void this.init();
    }
    async init() {
        // Load the game textures
        new IgeTexture("fairy", "./assets/textures/sprites/fairy.png");
        new IgeTexture("simpleBox", simpleBox);
        // Wait for our textures to load before continuing
        await ige.textures.whenLoaded();
        // Create the HTML canvas
        ige.engine.createFrontBuffer(true);
        // Start the engine
        await ige.engine.start();
        // Creates "baseScene" and adds a viewport
        ige.engine.addGraph(IgeBaseScene);
        const baseScene = ige.$("baseScene");
        // Create an entity and mount it to the scene
        new Rotator(0.1)
            .id("fairy1")
            .depth(1)
            .width(100)
            .height(100)
            .texture(ige.textures.get("fairy"))
            .translateTo(0, 0, 0)
            .mount(baseScene);
        // Create a second rotator entity and mount
        // it to the first one at 0, 50 relative to the
        // parent
        new Rotator(0.1)
            .id("fairy2")
            .depth(1)
            .width(50)
            .height(50)
            .texture(ige.textures.get("fairy"))
            .translateTo(0, 50, 0)
            .mount(ige.$("fairy1"));
        // Create a third rotator entity and mount
        // it to the first on at 0, -50 relative to the
        // parent, but assign it a smart texture!
        new Rotator(0.1)
            .id("simpleBox")
            .depth(1)
            .width(50)
            .height(50)
            .texture(ige.textures.get("simpleBox"))
            .translateTo(0, -50, 0)
            .mount(ige.$("fairy1"));
    }
}
