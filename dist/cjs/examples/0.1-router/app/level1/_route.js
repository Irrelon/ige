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
const instance_1 = require("@/engine/instance");
const Level1Scene_1 = require("./Level1Scene");
const IgeTexture_1 = require("@/engine/core/IgeTexture");
const simpleBox_1 = __importDefault(require("../../assets/textures/smartTextures/simpleBox"));
instance_1.ige.router.route("app/level1", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        // Load the game textures
        const textures = [
            new IgeTexture_1.IgeTexture("fairy", "./assets/textures/sprites/fairy.png"),
            new IgeTexture_1.IgeTexture("simpleBox", simpleBox_1.default)
        ];
        // Wait for our textures to load before continuing
        yield instance_1.ige.textures.whenLoaded();
        // Load our level onto the scenegraph
        yield instance_1.ige.engine.addGraph(Level1Scene_1.Level1Scene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield instance_1.ige.engine.removeGraph(Level1Scene_1.Level1Scene);
            instance_1.ige.textures.removeList(textures);
        });
    })
});
