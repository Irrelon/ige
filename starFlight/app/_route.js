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
import { IgeTexture } from "../../engine/core/IgeTexture.js";
import { AppClientScene } from "./AppClientScene.js";
import { AppServerScene } from "./AppServerScene.js";
import { tab } from "../assets/ui/tab.js";
import { timerCircle } from "../assets/ui/timerCircle.js";
import { infoWindow } from "../assets/ui/infoWindow.js";
import "./space/_route.js";
import "./splash/_route.js";
ige.router.route("app", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        // @ts-ignore
        window.ige = ige;
        yield ige.isReady();
        // Create the HTML canvas
        ige.engine.createFrontBuffer(true);
        // Start the engine
        yield ige.engine.start();
        const textures = [
            new IgeTexture("timerCircle", timerCircle),
            new IgeTexture("infoWindow", infoWindow),
            new IgeTexture("tab", tab)
        ];
        // Load our level onto the scenegraph
        yield ige.engine.addGraph(AppClientScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield ige.engine.removeGraph(AppClientScene);
            ige.textures.removeList(textures);
            yield ige.engine.stop();
        });
    }),
    server: () => __awaiter(void 0, void 0, void 0, function* () {
        // Set up the game storage for the server-side
        // This is the players object that stores player state per network
        // connection client id
        ige.game.players = {};
        yield ige.isReady();
        // Create the HTML canvas
        ige.engine.createFrontBuffer(true);
        // Start the engine
        yield ige.engine.start();
        // Load our level onto the scenegraph
        yield ige.engine.addGraph(AppServerScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield ige.engine.removeGraph(AppServerScene);
            yield ige.engine.stop();
        });
    })
});
