"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
// @ts-ignore
const IgeBaseClass_1 = require("../../engine/core/IgeBaseClass.js");
const IgeBaseScene_1 = require("../../engine/core/IgeBaseScene.js");
const IgeEntity_1 = require("../../engine/core/IgeEntity.js");
const IgeTexture_1 = require("../../engine/core/IgeTexture.js");
const IgeThreeJsRenderer_1 = require("../../engine/core/IgeThreeJsRenderer.js");
const instance_1 = require("../../engine/instance.js");
// @ts-ignore
window.ige = instance_1.ige;
class Client extends IgeBaseClass_1.IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            // Load the game textures
            new IgeTexture_1.IgeTexture("fairy", "../../assets/textures/sprites/fairy.png");
            // Wait for our textures to load before continuing
            yield instance_1.ige.textures.whenLoaded();
            // Create the HTML canvas
            const renderer = new IgeThreeJsRenderer_1.IgeThreeJsRenderer();
            instance_1.ige.engine.renderer(renderer);
            // Start the engine
            yield instance_1.ige.engine.start();
            void instance_1.ige.engine.addGraph(IgeBaseScene_1.IgeBaseScene);
            new IgeEntity_1.IgeEntity()
                .id("testEntity")
                .material({
                color: "#e1b9b9"
            })
                .width(100)
                .height(100)
                .translateTo(100, 0, 0)
                .rotateTo(0, 0, 0)
                .scaleTo(1, 1, 1)
                .mount(instance_1.ige.$("baseScene"));
        });
    }
}
exports.Client = Client;