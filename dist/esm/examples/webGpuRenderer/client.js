// @ts-ignore
import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeTexture } from "../../engine/core/IgeTexture.js"
import { ige } from "../../engine/instance.js"
// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
    classId = "Client";
    constructor() {
        super();
        void this.init();
    }
    async init() {
        // Load the game textures
        new IgeTexture("fairy", "./assets/textures/sprites/fairy.png");
        // Wait for our textures to load before continuing
        await ige.textures.whenLoaded();
        // Create the HTML canvas
        ige.engine.createFrontBuffer(true);
        // Start the engine
        await ige.engine.start();
    }
}
