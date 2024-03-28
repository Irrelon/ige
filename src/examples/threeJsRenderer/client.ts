// @ts-ignore
import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeBaseScene } from "@/engine/core/IgeBaseScene";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeThreeJsRenderer } from "@/engine/core/IgeThreeJsRenderer";
import { ige } from "@/engine/instance";
import type { IgeCanInit } from "@/types/IgeCanInit";

// @ts-ignore
window.ige = ige;

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";

	constructor () {
		super();
		void this.init();
	}

	async init () {
		// Load the game textures
		new IgeTexture("fairy", "../../assets/textures/sprites/fairy.png");

		// Wait for our textures to load before continuing
		await ige.textures.whenLoaded();

		// Create the HTML canvas
		const renderer = new IgeThreeJsRenderer();
		ige.engine.renderer(renderer);

		// Start the engine
		await ige.engine.start();

		void ige.engine.addGraph(IgeBaseScene);

		new IgeEntity()
			.id("testEntity")
			.material({
				color: "#e1b9b9"
			})
			.width(100)
			.height(100)
			.translateTo(100, 0, 0)
			.rotateTo(0, 0, 0)
			.scaleTo(1, 1, 1)
			.mount(ige.$("baseScene"));
	}
}
