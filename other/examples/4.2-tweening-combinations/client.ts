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

		const jumpTween = () => {
			new IgeTween(fairy0._translate)
				.stepBy(
					{
						y: -150
					},
					500,
					"outSine"
				)
				.stepBy(
					{
						y: 150
					},
					500,
					"inSine"
				)
				.start();
		};

		new IgeTween(fairy0._translate)
			.stepBy(
				{
					x: 200,
					y: 300
				},
				1000,
				"inOutSine"
			)
			.stepBy(
				{
					x: -200,
					y: -300
				},
				1000,
				"inOutSine"
			)
			.repeatMode(1, -1)
			.beforeStep(() => {
				// but we don't want her to just move there, we want her to jump there
				// The clue: Both tweens (vertical and horizontal movement) are running
				// the same time, looking like if the fairy jumped from a cliff!
				jumpTween();
			})
			.start();
	}
}
