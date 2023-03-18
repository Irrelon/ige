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
import simpleBox from "./assets/textures/smartTextures/simpleBox.js";
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js";
import { Level1 } from "./levels/Level1.js";
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
            ige.init();
            // Load the game textures
            new IgeTexture("fairy", "./assets/textures/sprites/fairy.png");
            new IgeTexture("simpleBox", simpleBox);
            // Wait for our textures to load before continuing
            yield ige.textures.whenLoaded();
            // Create the HTML canvas
            ige.engine.createFrontBuffer(true);
            // Start the engine
            yield ige.engine.start();
            // Creates "baseScene" and adds a viewport
            ige.engine.addGraph(IgeBaseScene);
            // Load our level onto the scenegraph
            ige.engine.addGraph(Level1);
        });
    }
}
