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
import { Level1Scene } from "./Level1Scene.js";
import { IgeTexture } from "../../../../engine/core/IgeTexture.js";
import simpleBox from "../../assets/textures/smartTextures/simpleBox.js";
ige.router.route("app/level1", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        // Load the game textures
        const textures = [
            new IgeTexture("fairy", "./assets/textures/sprites/fairy.png"),
            new IgeTexture("simpleBox", simpleBox)
        ];
        // Wait for our textures to load before continuing
        yield ige.textures.whenLoaded();
        // Load our level onto the scenegraph
        ige.engine.addGraph(Level1Scene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            ige.engine.removeGraph(Level1Scene);
            ige.textures.removeList(textures);
        });
    })
});
