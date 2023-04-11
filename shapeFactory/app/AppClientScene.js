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
import { IgeSceneGraph } from "../../engine/core/IgeSceneGraph.js";
import { IgeMousePanComponent } from "../../engine/components/IgeMousePanComponent.js";
import { squareSmartTexture } from "../assets/textures/smartTextures/square.js";
import { lineSmartTexture } from "../assets/textures/smartTextures/line.js";
import { triangleSmartTexture } from "../assets/textures/smartTextures/triangle.js";
import { circleSmartTexture } from "../assets/textures/smartTextures/circle.js";
import { starSmartTexture } from "../assets/textures/smartTextures/star.js";
import { flagSmartTexture } from "../assets/textures/smartTextures/flag.js";
import { gridSmartTexture } from "../assets/textures/smartTextures/grid.js";
import { IgeCellSheet } from "../../engine/core/IgeCellSheet.js";
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
            new IgeCellSheet("smoke", "assets/textures/sprites/smoke.png", 2, 2);
            new IgeTexture("wood", "assets/textures/sprites/wood.png");
            new IgeTexture("book", "assets/textures/sprites/science.png");
            new IgeTexture("diamond", "assets/textures/sprites/diamond.png");
            new IgeTexture("stone", "assets/textures/sprites/stone.png");
            new IgeTexture("brick", "assets/textures/sprites/brick.png");
            new IgeTexture("uranium", "assets/textures/sprites/uranium.png");
            new IgeTexture("mystium", "assets/textures/sprites/mystium.png");
            new IgeTexture("water", "assets/textures/sprites/water.png");
            new IgeTexture("elerium", "assets/textures/sprites/elerium.png");
            new IgeTexture("gold", "assets/textures/sprites/gold.png");
            new IgeTexture("energy", "assets/textures/sprites/energy.png");
            new IgeTexture("science", "assets/textures/sprites/science.png");
            new IgeTexture("arrow", "assets/textures/sprites/arrow.png");
            new IgeTexture("blueCube", "assets/textures/sprites/blueCube.png");
            new IgeTexture("purpleCube", "assets/textures/sprites/purpleCube.png");
            new IgeTexture("whiteCube", "assets/textures/sprites/whiteCube.png");
            new IgeTexture("whiteTubeS", "assets/textures/sprites/whiteTubeS.png");
            new IgeTexture("whiteTubeL", "assets/textures/sprites/whiteTubeL.png");
            new IgeTexture("roofE", "assets/textures/sprites/roofE.png");
            new IgeTexture("roofW", "assets/textures/sprites/roofW.png");
            new IgeTexture("factory1", "assets/textures/sprites/factory1.png");
            new IgeTexture("factory2", "assets/textures/sprites/factory2.png");
            new IgeTexture("headquarters", "assets/textures/sprites/headquarters.png");
            new IgeTexture("mine", "assets/textures/sprites/mine.png");
            new IgeTexture("flag", "assets/textures/sprites/flag.png");
            new IgeTexture("house1", "assets/textures/sprites/house1.png");
            new IgeTexture("squareSmartTexture", squareSmartTexture);
            new IgeTexture("lineSmartTexture", lineSmartTexture);
            new IgeTexture("triangleSmartTexture", triangleSmartTexture);
            new IgeTexture("circleSmartTexture", circleSmartTexture);
            new IgeTexture("starSmartTexture", starSmartTexture);
            new IgeTexture("flagSmartTexture", flagSmartTexture);
            new IgeTexture("gridSmartTexture", gridSmartTexture);
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
            vp1.drawBounds(true, true);
            vp1.drawBoundsData(true);
            vp1.camera.translateTo(0, 540, 0);
            yield network.start('http://localhost:2000');
        });
    }
    removeGraph() {
        const network = ige.network;
        network.stop();
        ige.engine.stop();
    }
}
