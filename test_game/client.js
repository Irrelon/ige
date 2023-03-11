var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../engine/instance.js";
import IgeBaseClass from "../engine/core/IgeBaseClass.js";
import IgeBaseScene from "../engine/core/IgeBaseScene.js";
import { IgeOptions } from "../engine/core/IgeOptions.js";
import { Level1 } from "./levels/Level1.js";
import IgeTexture from "../engine/core/IgeTexture.js";
import square from "./assets/textures/smartTextures/square.js";
import line from "./assets/textures/smartTextures/line.js";
import triangle from "./assets/textures/smartTextures/triangle.js";
import circle from "./assets/textures/smartTextures/circle.js";
// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
    constructor() {
        // Init the super class
        super();
        this.classId = "Client";
        void this.init();
    }
    init() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const options = new IgeOptions();
            options.set("masterVolume", 1);
            ige.init();
            new IgeTexture("fairy", "./assets/textures/sprites/fairy.png");
            new IgeTexture("square", square);
            new IgeTexture("line", line);
            new IgeTexture("triangle", triangle);
            new IgeTexture("circle", circle);
            const network = ige.network;
            (_a = ige.audio) === null || _a === void 0 ? void 0 : _a.masterVolume(options.get('masterVolume', 1));
            // Wait for our textures to load before continuing
            yield ige.textures.whenLoaded();
            // Create the HTML canvas
            ige.engine.createFrontBuffer(true);
            // Start the engine
            yield ige.engine.start();
            // Load the base scene data
            ige.engine.addGraph(IgeBaseScene);
            // Add all the items in Scene1 to the scenegraph
            // (see gameClasses/Scene1.js :: addGraph() to see
            // the method being called by the engine and how
            // the items are added to the scenegraph)
            ige.engine.addGraph(Level1);
            (_b = ige.engine.currentViewport()) === null || _b === void 0 ? void 0 : _b.drawBounds(true);
            network.start('http://localhost:2000', () => {
                // network.send("testRequest", "foo", (err, data) => {
                // 	console.log("testRequest response", err, data);
                // });
            });
        });
    }
}
