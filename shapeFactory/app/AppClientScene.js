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
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js";
import { IgeOptions } from "../../engine/core/IgeOptions.js";
import { IgeTexture } from "../../engine/core/IgeTexture.js";
import square from "../assets/textures/smartTextures/square.js";
import line from "../assets/textures/smartTextures/line.js";
import triangle from "../assets/textures/smartTextures/triangle.js";
import circle from "../assets/textures/smartTextures/circle.js";
import star from "../assets/textures/smartTextures/star.js";
import { IgeSceneGraph } from "../../engine/core/IgeSceneGraph.js";
import { IgeMousePanComponent } from "../../engine/components/IgeMousePanComponent.js";
import flag from "../assets/textures/smartTextures/flag.js";
// @ts-ignore
window.ige = ige;
export class AppClientScene extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "AppClientScene";
    }
    addGraph() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const options = new IgeOptions();
            options.set("masterVolume", 1);
            (_a = ige.audio) === null || _a === void 0 ? void 0 : _a.masterVolume(options.get('masterVolume', 1));
            new IgeTexture("fairy", "./assets/textures/sprites/fairy.png");
            new IgeTexture("square", square);
            new IgeTexture("line", line);
            new IgeTexture("triangle", triangle);
            new IgeTexture("circle", circle);
            new IgeTexture("star", star);
            new IgeTexture("flag", flag);
            const network = ige.network;
            // Wait for our textures to load before continuing
            yield ige.textures.whenLoaded();
            // Create the HTML canvas
            ige.engine.createFrontBuffer(true);
            // Start the engine
            yield ige.engine.start();
            // Load the base scene data
            yield ige.engine.addGraph(IgeBaseScene);
            const vp1 = ige.$("vp1");
            vp1.addComponent("mousePan", IgeMousePanComponent);
            vp1.components.mousePan.enabled(true);
            vp1.drawBounds(true);
            vp1.drawBoundsData(true);
            network.start('http://localhost:2000');
        });
    }
    removeGraph() {
        const network = ige.network;
        network.stop();
        ige.engine.stop();
    }
}
