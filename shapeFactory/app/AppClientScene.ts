import {ige} from "@/engine/instance";
import { IgeBaseScene } from "@/engine/core/IgeBaseScene";
import { IgeOptions } from "@/engine/core/IgeOptions";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeNetIoClientController } from "@/engine/network/client/IgeNetIoClientController";
import square from "../assets/textures/smartTextures/square";
import line from "../assets/textures/smartTextures/line";
import triangle from "../assets/textures/smartTextures/triangle";
import circle from "../assets/textures/smartTextures/circle";
import star from "../assets/textures/smartTextures/star";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeMousePanComponent } from "@/engine/components/IgeMousePanComponent";

// @ts-ignore
window.ige = ige;

export class AppClientScene extends IgeSceneGraph {
	classId = "AppClientScene";

	async addGraph () {
		const options = new IgeOptions();
		options.set("masterVolume", 1);

		ige.audio?.masterVolume(options.get('masterVolume', 1));

		new IgeTexture("fairy", "./assets/textures/sprites/fairy.png");
		new IgeTexture("square", square);
		new IgeTexture("line", line);
		new IgeTexture("triangle", triangle);
		new IgeTexture("circle", circle);
		new IgeTexture("star", star);

		const network = (ige.network as IgeNetIoClientController);

		// Wait for our textures to load before continuing
		await ige.textures.whenLoaded();

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Start the engine
		await ige.engine.start();

		// Load the base scene data
		await ige.engine.addGraph(IgeBaseScene);
		const vp1 = ige.$("vp1") as IgeViewport;

		vp1.addComponent("mousePan", IgeMousePanComponent);
		(vp1.components.mousePan as IgeMousePanComponent).enabled(true);

		vp1.drawBounds(true);
		vp1.drawBoundsData(true);

		network.start('http://localhost:2000');
	}

	removeGraph () {
		const network = (ige.network as IgeNetIoClientController);
		network.stop();
		ige.engine.stop();
	}
}
