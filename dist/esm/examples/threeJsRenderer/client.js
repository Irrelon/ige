// @ts-ignore
import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeTexture } from "../../engine/core/IgeTexture.js"
import { IgeThreeJsRenderer } from "../../engine/core/IgeThreeJsRenderer.js"
import { IgeTween } from "../../engine/core/IgeTween.js"
import { ige } from "../../engine/instance.js"
import { degreesToRadians } from "../../engine/utils/maths.js"
import { IgeTweenRepeatMode } from "../../enums/IgeTweenRepeatMode.js"
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
            .id("testEntity1")
            .materialData({
            color: "#e1b9b9"
        })
            .width(100)
            .height(100)
            .translateTo(100, -100, 0)
            .rotateTo(0, 0, 0)
            .scaleTo(1, 1, 1)
            .mount(ige.$("baseScene"));
        const numEntities = 150;
        const columns = Math.floor(Math.sqrt(numEntities));
        for (let i = 0; i < numEntities; i++) {
            const row = Math.floor(i / (numEntities / columns));
            const y = 0; //(row * 100);
            const x = 0; //(i * 100) - (row * (columns * 100));
            const entity = new IgeEntity()
                .materialData({
                color: "#ffffff",
                url: "./lenna.png"
            })
                .width(100)
                .height(100)
                .translateTo(x, y, 0)
                .rotateTo(0, 0, 0)
                .scaleTo(1, 1, 1)
                .mount(ige.$("baseScene"));
            new IgeTween(entity._translate)
                .stepTo({
                x: (Math.random() * 2000) - 1000,
                y: (Math.random() * 2000) - 1000,
                z: (Math.random() * 100) - 50
            })
                .stepTo({
                x: x,
                y: y,
                z: 0
            })
                .duration(5000)
                .repeatMode(IgeTweenRepeatMode.reverse, -1)
                .easing("inOutExpo")
                .start();
            new IgeTween(entity._rotate)
                .stepTo({
                x: degreesToRadians(Math.random() * 360),
                z: degreesToRadians(Math.random() * 360)
            })
                .stepTo({
                x: 0,
                z: 0
            })
                .duration(5000)
                .repeatMode(IgeTweenRepeatMode.reverse, -1)
                .easing("inOutExpo")
                .start();
        }
    }
}
