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
import { Level1 } from "./Level1.js";
import { UiClientScene } from "./UiClientScene.js";
import { controllerClient } from "../controllerClient.js";
import { controllerServer } from "../controllerServer.js";
ige.router.route("app/level1", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        // Add all the items in Scene1 to the scenegraph
        // (see gameClasses/Scene1.js :: addGraph() to see
        // the method being called by the engine and how
        // the items are added to the scenegraph)
        yield ige.engine.addGraph(Level1);
        yield ige.engine.addGraph(UiClientScene);
        const onControllerUnload = yield controllerClient();
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield onControllerUnload();
            yield ige.engine.removeGraph(UiClientScene);
            yield ige.engine.removeGraph(Level1);
        });
    }),
    server: () => __awaiter(void 0, void 0, void 0, function* () {
        yield ige.engine.addGraph(Level1);
        const onControllerUnload = yield controllerServer();
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield onControllerUnload();
            yield ige.engine.removeGraph(Level1);
        });
    })
});
