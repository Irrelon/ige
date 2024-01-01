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
const instance_1 = require("@/engine/instance");
const IgeBaseClass_1 = require("@/engine/core/IgeBaseClass");
const IgeTexture_1 = require("@/engine/core/IgeTexture");
const IgeScene2d_1 = require("@/engine/core/IgeScene2d");
const IgeViewport_1 = require("@/engine/core/IgeViewport");
const IgeEntity_1 = require("@/engine/core/IgeEntity");
const IgeTween_1 = require("@/engine/core/IgeTween");
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
            new IgeTexture_1.IgeTexture("fairy", "../assets/textures/sprites/fairy.png");
            // Wait for our textures to load before continuing
            yield instance_1.ige.textures.whenLoaded();
            // Create the HTML canvas
            instance_1.ige.engine.createFrontBuffer(true);
            // Start the engine
            yield instance_1.ige.engine.start();
            // Create the scene
            const scene1 = new IgeScene2d_1.IgeScene2d()
                .id('scene1');
            // Create the main viewport
            new IgeViewport_1.IgeViewport()
                .id('vp1')
                .autoSize(true)
                .scene(scene1)
                .drawBounds(true)
                .drawBoundsData(true)
                .mount(instance_1.ige.engine);
            const fairy0 = new IgeEntity_1.IgeEntity()
                .id('fairy0')
                .depth(0)
                .width(100)
                .height(100)
                .texture(instance_1.ige.textures.get("fairy"))
                .drawBounds(false)
                .drawBoundsData(false)
                .mount(scene1);
            const newTween = new IgeTween_1.IgeTween(fairy0._translate)
                .stepBy({
                x: 100
            })
                .duration(1000)
                .start();
        });
    }
}
exports.Client = Client;
