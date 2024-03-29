import { SplashClientScene } from "./SplashClientScene";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { ige } from "@/engine/exports";
import { nebulaFieldSmartTexture } from "../../assets/backgrounds/nebulaFieldSmartTexture";
import { starFieldSmartTexture } from "../../assets/backgrounds/starFieldSmartTexture";
import { igeButton } from "../../assets/ui/igeButton";

ige.router.route("app/splash", {
	client: async () => {
		const textures = [
			// UI
			new IgeTexture("title", "assets/ui/title.png"),
			new IgeTexture("button", igeButton),
			new IgeTexture("irrelon", "assets/ui/irrelon.png"),
			// Game
			new IgeTexture("starfield", starFieldSmartTexture),
			new IgeTexture("neb1", "assets/backgrounds/neb1.png"),
			new IgeTexture("neb2", "assets/backgrounds/neb2.png"),
			new IgeTexture("neb3", "assets/backgrounds/neb3.png"),
			new IgeTexture("neb4", "assets/backgrounds/neb4.png"),
			new IgeTexture("nebula", nebulaFieldSmartTexture)
		];

		await ige.textures.whenLoaded();

		// Load our level onto the scenegraph
		await ige.engine.addGraph(SplashClientScene);

		return async () => {
			await ige.engine.removeGraph(SplashClientScene);
			ige.textures.removeList(textures);
		};
	}
});
