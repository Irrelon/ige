// @ts-ignore
import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeBaseScene } from "@/engine/core/IgeBaseScene";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeWebGpuRenderer } from "@/engine/core/IgeWebGpuRenderer";
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
		const renderer = new IgeWebGpuRenderer();
		ige.engine.renderer(renderer);

		// Start the engine
		await ige.engine.start();

		void ige.engine.addGraph(IgeBaseScene);
	}
}