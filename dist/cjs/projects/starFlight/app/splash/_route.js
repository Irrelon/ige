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
const SplashClientScene_1 = require("./SplashClientScene");
const IgeTexture_1 = require("../../../../engine/core/IgeTexture.js");
const instance_1 = require("../../../../engine/instance.js");
const nebulaFieldSmartTexture_1 = require("../../assets/backgrounds/nebulaFieldSmartTexture");
const starFieldSmartTexture_1 = require("../../assets/backgrounds/starFieldSmartTexture");
const igeButton_1 = require("../../assets/ui/igeButton");
instance_1.ige.router.route("app/splash", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        const textures = [
            // UI
            new IgeTexture_1.IgeTexture("title", "assets/ui/title.png"),
            new IgeTexture_1.IgeTexture("button", igeButton_1.igeButton),
            new IgeTexture_1.IgeTexture("irrelon", "assets/ui/irrelon.png"),
            // Game
            new IgeTexture_1.IgeTexture("starfield", starFieldSmartTexture_1.starFieldSmartTexture),
            new IgeTexture_1.IgeTexture("neb1", "assets/backgrounds/neb1.png"),
            new IgeTexture_1.IgeTexture("neb2", "assets/backgrounds/neb2.png"),
            new IgeTexture_1.IgeTexture("neb3", "assets/backgrounds/neb3.png"),
            new IgeTexture_1.IgeTexture("neb4", "assets/backgrounds/neb4.png"),
            new IgeTexture_1.IgeTexture("nebula", nebulaFieldSmartTexture_1.nebulaFieldSmartTexture)
        ];
        yield instance_1.ige.textures.whenLoaded();
        // Load our level onto the scenegraph
        yield instance_1.ige.engine.addGraph(SplashClientScene_1.SplashClientScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield instance_1.ige.engine.removeGraph(SplashClientScene_1.SplashClientScene);
            instance_1.ige.textures.removeList(textures);
        });
    })
});
