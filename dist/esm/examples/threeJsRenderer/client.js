// @ts-ignore
import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeTexture } from "../../engine/core/IgeTexture.js"
import { IgeThreeJsRenderer } from "../../engine/core/IgeThreeJsRenderer.js"
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
        const renderer = new IgeThreeJsRenderer();
        ige.engine.renderer(renderer);
        // Start the engine
        await ige.engine.start();
        void ige.engine.addGraph(IgeBaseScene);
        new IgeEntity()
            .id("testEntity")
            .material({
            color: "#e1b9b9"
        })
            .width(100)
            .height(100)
            .translateTo(100, 0, 0)
            .rotateTo(0, 0, 0)
            .scaleTo(1, 1, 1)
            .mount(ige.$("baseScene"));
    }
}
