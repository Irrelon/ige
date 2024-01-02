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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const simpleBox_1 = __importDefault(require("./assets/textures/smartTextures/simpleBox"));
const Rotator_1 = require("./gameClasses/Rotator");
const IgeBaseClass_1 = require("../../engine/core/IgeBaseClass.js");
const IgeBaseScene_1 = require("../../engine/core/IgeBaseScene.js");
const IgeTexture_1 = require("../../engine/core/IgeTexture.js");
const instance_1 = require("../../engine/instance.js");
// @ts-ignore
window.ige = instance_1.ige;
class Client extends IgeBaseClass_1.IgeBaseClass {
    constructor() {
        // Init the super class
        super();
        this.classId = "Client";
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            // Load the game textures
            new IgeTexture_1.IgeTexture("fairy", "./assets/textures/sprites/fairy.png");
            new IgeTexture_1.IgeTexture("simpleBox", simpleBox_1.default);
            // Wait for our textures to load before continuing
            yield instance_1.ige.textures.whenLoaded();
            // Create the HTML canvas
            instance_1.ige.engine.createFrontBuffer(true);
            // Start the engine
            yield instance_1.ige.engine.start();
            // Creates "baseScene" and adds a viewport
            instance_1.ige.engine.addGraph(IgeBaseScene_1.IgeBaseScene);
            const baseScene = instance_1.ige.$("baseScene");
            // Create an entity and mount it to the scene
            new Rotator_1.Rotator(0.1)
                .id("fairy1")
                .depth(1)
                .width(100)
                .height(100)
                .texture(instance_1.ige.textures.get("fairy"))
                .translateTo(0, 0, 0)
                .mount(baseScene);
            // Create a second rotator entity and mount
            // it to the first one at 0, 50 relative to the
            // parent
            new Rotator_1.Rotator(0.1)
                .id("fairy2")
                .depth(1)
                .width(50)
                .height(50)
                .texture(instance_1.ige.textures.get("fairy"))
                .translateTo(0, 50, 0)
                .mount(instance_1.ige.$("fairy1"));
            // Create a third rotator entity and mount
            // it to the first on at 0, -50 relative to the
            // parent, but assign it a smart texture!
            new Rotator_1.Rotator(0.1)
                .id("simpleBox")
                .depth(1)
                .width(50)
                .height(50)
                .texture(instance_1.ige.textures.get("simpleBox"))
                .translateTo(0, -50, 0)
                .mount(instance_1.ige.$("fairy1"));
        });
    }
}
exports.Client = Client;
