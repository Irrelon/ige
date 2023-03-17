import { ige } from "../../../../engine/instance";
import { SplashScene } from "./SplashScene";

ige.router.route("app/splash", {
	client: async () => {
		// Load our level onto the scenegraph
		ige.engine.addGraph(SplashScene);

		return async () => {
			ige.engine.removeGraph(SplashScene);
		}
	}
})
