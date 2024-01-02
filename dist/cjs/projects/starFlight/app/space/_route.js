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
const SpaceClientScene_1 = require("./SpaceClientScene");
const SpaceServerScene_1 = require("./SpaceServerScene");
const IgeCellSheet_1 = require("../../../../engine/core/IgeCellSheet.js");
const IgeTexture_1 = require("../../../../engine/core/IgeTexture.js");
const instance_1 = require("../../../../engine/instance.js");
const nebulaFieldSmartTexture_1 = require("../../assets/backgrounds/nebulaFieldSmartTexture");
const starFieldSmartTexture_1 = require("../../assets/backgrounds/starFieldSmartTexture");
const laser1_1 = require("../../assets/sprites/laser1");
const igeButton_1 = require("../../assets/ui/igeButton");
const radarSmartTexture_1 = require("../../assets/ui/radarSmartTexture");
const targetSmartTexture_1 = require("../../assets/ui/targetSmartTexture");
instance_1.ige.router.route("app/space", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        const textures = [
            // UI
            new IgeTexture_1.IgeTexture("title", "assets/ui/title.png"),
            new IgeTexture_1.IgeTexture("button", igeButton_1.igeButton),
            new IgeTexture_1.IgeTexture("irrelon", "assets/ui/irrelon.png"),
            new IgeTexture_1.IgeTexture("windowLocalScan", "assets/ui/windowLocalScan3.png"),
            new IgeTexture_1.IgeTexture("windowStats", "assets/ui/windowStats2.png"),
            new IgeTexture_1.IgeTexture("windowControls", "assets/ui/windowControls5.png"),
            new IgeTexture_1.IgeTexture("windowTargetData", "assets/ui/windowTargetData.png"),
            // Game
            new IgeTexture_1.IgeTexture("ship1", "assets/sprites/ship1.png"),
            new IgeTexture_1.IgeTexture("asteroid1", "assets/sprites/asteroid1.png"),
            new IgeTexture_1.IgeTexture("asteroid2", "assets/sprites/asteroid2.png"),
            new IgeTexture_1.IgeTexture("asteroid3", "assets/sprites/asteroid3.png"),
            new IgeTexture_1.IgeTexture("asteroid4", "assets/sprites/asteroid4.png"),
            new IgeTexture_1.IgeTexture("asteroid5", "assets/sprites/asteroid5.png"),
            new IgeTexture_1.IgeTexture("asteroid6", "assets/sprites/asteroid6.png"),
            new IgeTexture_1.IgeTexture("asteroid7", "assets/sprites/asteroid7.png"),
            new IgeTexture_1.IgeTexture("asteroid8", "assets/sprites/asteroid8.png"),
            new IgeTexture_1.IgeTexture("spaceStation1", "assets/sprites/spaceStation1.png"),
            new IgeTexture_1.IgeTexture("starfield", starFieldSmartTexture_1.starFieldSmartTexture),
            new IgeTexture_1.IgeTexture("neb1", "assets/backgrounds/neb1.png"),
            new IgeTexture_1.IgeTexture("neb2", "assets/backgrounds/neb2.png"),
            new IgeTexture_1.IgeTexture("neb3", "assets/backgrounds/neb3.png"),
            new IgeTexture_1.IgeTexture("neb4", "assets/backgrounds/neb4.png"),
            new IgeTexture_1.IgeTexture("nebula", nebulaFieldSmartTexture_1.nebulaFieldSmartTexture),
            new IgeTexture_1.IgeTexture("radar", radarSmartTexture_1.radarSmartTexture),
            new IgeTexture_1.IgeTexture("target", targetSmartTexture_1.targetSmartTexture),
            new IgeTexture_1.IgeTexture("laser1", laser1_1.laserSmartTexture),
            new IgeCellSheet_1.IgeCellSheet("explosions1", "assets/sprites/explosions.png", 8, 22),
            new IgeCellSheet_1.IgeCellSheet("ore1", "assets/sprites/ore1.png", 8, 2),
            new IgeTexture_1.IgeTexture("jumpGate1", "assets/sprites/jumpGate1.png"),
            new IgeTexture_1.IgeTexture("jumpGate2", "assets/sprites/jumpGate2.png"),
            new IgeTexture_1.IgeTexture("abilityButton", "assets/ui/abilityButton.png")
        ];
        yield instance_1.ige.textures.whenLoaded();
        yield instance_1.ige.engine.addGraph(SpaceClientScene_1.SpaceClientScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield instance_1.ige.engine.removeGraph(SpaceClientScene_1.SpaceClientScene);
            instance_1.ige.textures.removeList(textures);
        });
    }),
    server: () => __awaiter(void 0, void 0, void 0, function* () {
        instance_1.ige.box2d.createWorld().start();
        yield instance_1.ige.engine.addGraph(SpaceServerScene_1.SpaceServerScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield instance_1.ige.engine.removeGraph(SpaceServerScene_1.SpaceServerScene);
        });
    })
});
