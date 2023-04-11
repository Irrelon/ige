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
import "./level1/_route";
ige.router.route("app", {
    client: () => __awaiter(void 0, void 0, void 0, function* () {
        yield ige.isReady();
        return import("./AppClientScene.js").then(({ AppClientScene: App }) => {
            return ige.engine.addGraph(App);
        });
    }),
    server: () => __awaiter(void 0, void 0, void 0, function* () {
        yield ige.isReady();
        return import("./AppServerScene.js").then(({ AppServerScene: App }) => {
            return ige.engine.addGraph(App);
        });
    })
});
