var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../../../../engine/instance.js";
import { starFieldSmartTexture } from "../../assets/backgrounds/starFieldSmartTexture.js";
import { nebulaFieldSmartTexture } from "../../assets/backgrounds/nebulaFieldSmartTexture.js";
import { igeButton } from "../../assets/ui/igeButton.js";
import { IgeTexture } from "../../../../engine/core/IgeTexture.js";
import { SplashClientScene } from "./SplashClientScene.js";
ige.router.route('app/splash', {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        const textures = [
            // UI
            new IgeTexture("title", 'assets/ui/title.png'),
            new IgeTexture("button", igeButton),
            new IgeTexture("irrelon", 'assets/ui/irrelon.png'),
            // Game
            new IgeTexture("starfield", starFieldSmartTexture),
            new IgeTexture("neb1", 'assets/backgrounds/neb1.png'),
            new IgeTexture("neb2", 'assets/backgrounds/neb2.png'),
            new IgeTexture("neb3", 'assets/backgrounds/neb3.png'),
            new IgeTexture("neb4", 'assets/backgrounds/neb4.png'),
            new IgeTexture("nebula", nebulaFieldSmartTexture)
        ];
        yield ige.textures.whenLoaded();
        // Load our level onto the scenegraph
        yield ige.engine.addGraph(SplashClientScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield ige.engine.removeGraph(SplashClientScene);
            ige.textures.removeList(textures);
        });
    })
});
