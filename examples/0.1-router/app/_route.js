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
import IgeBaseScene from "../../../engine/core/IgeBaseScene.js";
import "./splash/_route.js";
import "./level1/_route.js";
import IgeUiManagerComponent from "../../../engine/components/IgeUiManagerComponent.js";
ige.router.route("app", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        // @ts-ignore
        window.ige = ige;
        ige.engine.addComponent("ui", IgeUiManagerComponent);
        // Create the HTML canvas
        ige.engine.createFrontBuffer(true);
        // Start the engine
        yield ige.engine.start();
        // Creates "baseScene" and adds a viewport
        ige.engine.addGraph(IgeBaseScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            // Removes the IgeBaseScene from the scenegraph
            ige.engine.removeGraph(IgeBaseScene);
            yield ige.engine.stop();
        });
    })
});
