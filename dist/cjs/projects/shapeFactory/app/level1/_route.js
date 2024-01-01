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
const instance_1 = require("@/engine/instance");
const Level1_1 = require("./Level1");
const UiClientScene_1 = require("./UiClientScene");
const controllerClient_1 = require("../controllerClient");
const controllerServer_1 = require("../controllerServer");
instance_1.ige.router.route("app/level1", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        // Add all the items in Scene1 to the scenegraph
        // (see gameClasses/Scene1.js :: addGraph() to see
        // the method being called by the engine and how
        // the items are added to the scenegraph)
        yield instance_1.ige.engine.addGraph(Level1_1.Level1);
        yield instance_1.ige.engine.addGraph(UiClientScene_1.UiClientScene);
        const onControllerUnload = yield (0, controllerClient_1.controllerClient)();
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield onControllerUnload();
            yield instance_1.ige.engine.removeGraph(UiClientScene_1.UiClientScene);
            yield instance_1.ige.engine.removeGraph(Level1_1.Level1);
        });
    }),
    server: () => __awaiter(void 0, void 0, void 0, function* () {
        yield instance_1.ige.engine.addGraph(Level1_1.Level1);
        const onControllerUnload = yield (0, controllerServer_1.controllerServer)();
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield onControllerUnload();
            yield instance_1.ige.engine.removeGraph(Level1_1.Level1);
        });
    })
});
