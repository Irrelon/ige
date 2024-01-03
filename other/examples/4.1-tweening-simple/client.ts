import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeTween } from "@/engine/core/IgeTween";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { ige } from "@/engine/exports";
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
		new IgeTexture("fairy", "../assets/textures/sprites/fairy.png");

		// Wait for our textures to load before continuing
		await ige.textures.whenLoaded();

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start();

		// Create the scene
		const scene1 = new IgeScene2d().id("scene1");

		// Create the main viewport
		new IgeViewport()
			.id("vp1")
			.autoSize(true)
			.scene(scene1)
			.drawBounds(true)
			.drawBoundsData(true)
			.mount(ige.engine);

		const fairy0 = new IgeEntity()
			.id("fairy0")
			.depth(0)
			.width(100)
			.height(100)
			.texture(ige.textures.get("fairy"))
			.drawBounds(false)
			.drawBoundsData(false)
			.mount(scene1);

		const newTween = new IgeTween(fairy0._translate)
			.stepBy({
				x: 100
			})
			.duration(1000)
			.start();
	}
}
