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
const instance_1 = require("../../engine/instance.js");
const IgeBaseClass_1 = require("../../engine/core/IgeBaseClass.js");
const IgeTexture_1 = require("../../engine/core/IgeTexture.js");
const IgeScene2d_1 = require("../../engine/core/IgeScene2d.js");
const IgeViewport_1 = require("../../engine/core/IgeViewport.js");
const IgeEntity_1 = require("../../engine/core/IgeEntity.js");
const IgeTween_1 = require("../../engine/core/IgeTween.js");
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
            const obj = [];
            for (let i = 0; i < 10; i++) {
                obj[i] = new IgeEntity_1.IgeEntity()
                    .id('fairy' + i)
                    .depth(i)
                    .width(100)
                    .height(100)
                    .texture(instance_1.ige.textures.get("fairy"))
                    .drawBounds(false)
                    .drawBoundsData(false)
                    .opacity(0)
                    .mount(scene1);
                obj[i]._translate.tween()
                    .stepTo({
                    x: 100 + (i * 20),
                    y: 0 + (i * 20)
                }, 1000, 'inOutSine')
                    .stepTo({
                    x: 0,
                    y: -100 - (i * 20)
                }, 1000, 'inOutSine')
                    .stepTo({
                    x: -100 - (i * 20),
                    y: 100 + (i * 20)
                }, 1000, 'inOutSine')
                    .beforeStep(function (tween, step) {
                    console.log('beforeStep', step);
                })
                    .afterStep(function (tween, step) {
                    console.log('afterStep', step);
                })
                    .repeatMode(1, -1)
                    .startTime(instance_1.ige.engine._currentTime + i)
                    .start();
                new IgeTween_1.IgeTween(obj[i])
                    .properties({
                    _opacity: 0.6
                })
                    .duration(2000)
                    .start();
            }
        });
    }
}
exports.Client = Client;
