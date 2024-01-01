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
import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js";
import { IgeTexture } from "../../engine/core/IgeTexture.js";
import { IgeScene2d } from "../../engine/core/IgeScene2d.js";
import { IgeViewport } from "../../engine/core/IgeViewport.js";
import { IgeEntity } from "../../engine/core/IgeEntity.js";
import { IgeTween } from "../../engine/core/IgeTween.js";
// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            // Load the game textures
            new IgeTexture("fairy", "../assets/textures/sprites/fairy.png");
            // Wait for our textures to load before continuing
            yield ige.textures.whenLoaded();
            // Create the HTML canvas
            ige.engine.createFrontBuffer(true);
            // Start the engine
            yield ige.engine.start();
            // Create the scene
            const scene1 = new IgeScene2d()
                .id('scene1');
            // Create the main viewport
            new IgeViewport()
                .id('vp1')
                .autoSize(true)
                .scene(scene1)
                .drawBounds(true)
                .drawBoundsData(true)
                .mount(ige.engine);
            const fairy0 = new IgeEntity()
                .id('fairy0')
                .depth(0)
                .width(100)
                .height(100)
                .texture(ige.textures.get("fairy"))
                .drawBounds(false)
                .drawBoundsData(false)
                .mount(scene1);
            const newTween = new IgeTween(fairy0._translate)
                .stepBy({
                x: 100
            })
                .duration(1000)
                .start();
        });
    }
}
