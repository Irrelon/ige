import { ige } from "@/engine/instance";
import { Level1Scene } from "./Level1Scene";
import { IgeTexture } from "@/engine/core/IgeTexture";
import simpleBox from "../../assets/textures/smartTextures/simpleBox";

ige.router.route("app/level1", {
	client: async () => {
		// Load the game textures
		const textures = [
			new IgeTexture("fairy", "./assets/textures/sprites/fairy.png"),
			new IgeTexture("simpleBox", simpleBox)
		];

		// Wait for our textures to load before continuing
		await ige.textures.whenLoaded();

		// Load our level onto the scenegraph
		ige.engine.addGraph(Level1Scene);

		return async () => {
			ige.engine.removeGraph(Level1Scene);
			ige.textures.removeList(textures);
		}
	}
});
