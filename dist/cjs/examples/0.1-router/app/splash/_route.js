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
const SplashScene_1 = require("./SplashScene");
const instance_1 = require("../../../../engine/instance.js");
instance_1.ige.router.route("app/splash", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        // Load our level onto the scenegraph
        yield instance_1.ige.engine.addGraph(SplashScene_1.SplashScene);
        return () => __awaiter(void 0, void 0, void 0, function* () {
            yield instance_1.ige.engine.removeGraph(SplashScene_1.SplashScene);
        });
    })
});
