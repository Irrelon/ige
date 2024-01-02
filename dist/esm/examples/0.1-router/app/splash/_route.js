import { SplashScene } from "./SplashScene.js"
import { ige } from "../../../../engine/instance.js"
ige.router.route("app/splash", {
    client: async () => {
        // Load our level onto the scenegraph
        await ige.engine.addGraph(SplashScene);
        return async () => {
            await ige.engine.removeGraph(SplashScene);
        };
    }
});
