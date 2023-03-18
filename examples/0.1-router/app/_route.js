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
import { IgeUiManagerComponent } from "../../../engine/components/IgeUiManagerComponent.js";
import { AppScene } from "./AppScene.js";
import "./splash/_route";
import "./level1/_route";
ige.router.route("app", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        // @ts-ignore
        window.ige = ige;
        ige.engine.addComponent("ui", IgeUiManagerComponent);
        // Create the HTML canvas
        ige.engine.createFrontBuffer(true);
        // Start the engine
        yield ige.engine.start();
        // Load our level onto the scenegraph
        ige.engine.addGraph(AppScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            ige.engine.removeGraph(AppScene);
            yield ige.engine.stop();
        });
    })
});
