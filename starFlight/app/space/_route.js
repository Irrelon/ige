var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../../../engine/instance.js";
import { SpaceServerScene } from "./SpaceServerScene.js";
import { IgeTexture } from "../../../engine/core/IgeTexture.js";
import { igeButton } from "../../assets/ui/igeButton.js";
import { starFieldSmartTexture } from "../../assets/backgrounds/starFieldSmartTexture.js";
import { nebulaFieldSmartTexture } from "../../assets/backgrounds/nebulaFieldSmartTexture.js";
import { IgeCellSheet } from "../../../engine/core/IgeCellSheet.js";
import { radarSmartTexture } from "../../assets/ui/radarSmartTexture.js";
import { targetSmartTexture } from "../../assets/ui/targetSmartTexture.js";
import { laserSmartTexture } from "../../assets/sprites/laser1.js";
import { SpaceClientScene } from "./SpaceClientScene.js";
ige.router.route('app/space', {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        const textures = [
            // UI
            new IgeTexture("title", 'assets/ui/title.png'),
            new IgeTexture("button", igeButton),
            new IgeTexture("irrelon", 'assets/ui/irrelon.png'),
            new IgeTexture("windowLocalScan", 'assets/ui/windowLocalScan3.png'),
            new IgeTexture("windowStats", 'assets/ui/windowStats2.png'),
            new IgeTexture("windowControls", 'assets/ui/windowControls5.png'),
            new IgeTexture("windowTargetData", 'assets/ui/windowTargetData.png'),
            // Game
            new IgeTexture("ship1", 'assets/sprites/ship1.png'),
            new IgeTexture("asteroid1", 'assets/sprites/asteroid1.png'),
            new IgeTexture("asteroid2", 'assets/sprites/asteroid2.png'),
            new IgeTexture("asteroid3", 'assets/sprites/asteroid3.png'),
            new IgeTexture("asteroid4", 'assets/sprites/asteroid4.png'),
            new IgeTexture("asteroid5", 'assets/sprites/asteroid5.png'),
            new IgeTexture("asteroid6", 'assets/sprites/asteroid6.png'),
            new IgeTexture("asteroid7", 'assets/sprites/asteroid7.png'),
            new IgeTexture("asteroid8", 'assets/sprites/asteroid8.png'),
            new IgeTexture("spaceStation1", 'assets/sprites/spaceStation1.png'),
            new IgeTexture("starfield", starFieldSmartTexture),
            new IgeTexture("neb1", 'assets/backgrounds/neb1.png'),
            new IgeTexture("neb2", 'assets/backgrounds/neb2.png'),
            new IgeTexture("neb3", 'assets/backgrounds/neb3.png'),
            new IgeTexture("neb4", 'assets/backgrounds/neb4.png'),
            new IgeTexture("nebula", nebulaFieldSmartTexture),
            new IgeTexture("radar", radarSmartTexture),
            new IgeTexture("target", targetSmartTexture),
            new IgeTexture("laser1", laserSmartTexture),
            new IgeCellSheet("explosions1", 'assets/sprites/explosions.png', 8, 22),
            new IgeCellSheet("ore1", 'assets/sprites/ore1.png', 8, 2),
            new IgeTexture("jumpGate1", 'assets/sprites/jumpGate1.png'),
            new IgeTexture("jumpGate2", 'assets/sprites/jumpGate2.png'),
            new IgeTexture("abilityButton", 'assets/ui/abilityButton.png')
        ];
        yield ige.textures.whenLoaded();
        yield ige.engine.addGraph(SpaceClientScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield ige.engine.removeGraph(SpaceClientScene);
            ige.textures.removeList(textures);
        });
    }),
    server: () => __awaiter(void 0, void 0, void 0, function* () {
        ige.box2d.createWorld().start();
        yield ige.engine.addGraph(SpaceServerScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield ige.engine.removeGraph(SpaceServerScene);
        });
    })
});
