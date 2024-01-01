import { ige } from "../../../engine/instance.js"
import "./level1/_route";
ige.router.route("app", {
    client: async () => {
        await ige.isReady();
        return import("./AppClientScene.js").then(({ AppClientScene: App }) => {
            return ige.engine.addGraph(App);
        });
    },
    server: async () => {
        await ige.isReady();
        return import("./AppServerScene.js").then(({ AppServerScene: App }) => {
            return ige.engine.addGraph(App);
        });
    }
});
