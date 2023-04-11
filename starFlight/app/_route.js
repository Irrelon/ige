var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "@/engine/instance";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { AppClientScene } from "./AppClientScene";
import { AppServerScene } from "./AppServerScene";
import { tab } from "../assets/ui/tab";
import { timerCircle } from "../assets/ui/timerCircle";
import { infoWindow } from "../assets/ui/infoWindow";
import "./space/_route";
import "./splash/_route";
ige.router.route("app", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        // @ts-ignore
        window.ige = ige;
        yield ige.isReady();
        const textures = [
            new IgeTexture("timerCircle", timerCircle),
            new IgeTexture("infoWindow", infoWindow),
            new IgeTexture("tab", tab)
        ];
        // Create the HTML canvas
        ige.engine.createFrontBuffer(true);
        // Start the engine
        yield ige.engine.start();
        // Load our level onto the scenegraph
        yield ige.engine.addGraph(AppClientScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield ige.engine.removeGraph(AppClientScene);
            ige.textures.removeList(textures);
            yield ige.engine.stop();
        });
    }),
    server: () => __awaiter(void 0, void 0, void 0, function* () {
        yield ige.isReady();
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
