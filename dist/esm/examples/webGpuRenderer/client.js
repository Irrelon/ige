// @ts-ignore
import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js"
import { IgeTexture } from "../../engine/core/IgeTexture.js"
import { IgeWebGpuRenderer } from "../../engine/core/IgeWebGpuRenderer.js"
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
        new IgeTexture("fairy", "../../assets/textures/sprites/fairy.png");
        // Wait for our textures to load before continuing
        await ige.textures.whenLoaded();
        // Create the HTML canvas
        const renderer = new IgeWebGpuRenderer();
        ige.engine.renderer(renderer);
        // Start the engine
        await ige.engine.start();
        void ige.engine.addGraph(IgeBaseScene);
    }
}
