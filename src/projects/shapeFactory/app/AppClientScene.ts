import { IgeBaseScene } from "@/engine/core/IgeBaseScene";
import { IgeCellSheet } from "@/engine/core/IgeCellSheet";
import { IgeOptions } from "@/engine/core/IgeOptions";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import { ige } from "@/engine/instance";
import type { IgeNetIoClientController } from "@/engine/network/client/IgeNetIoClientController";
import { IgeMousePanComponent } from "@/engine/components/IgeMousePanComponent";
import { circleSmartTexture } from "../assets/textures/smartTextures/circle";
import { flagSmartTexture } from "../assets/textures/smartTextures/flag";
import { gridSmartTexture } from "../assets/textures/smartTextures/grid";
import { lineSmartTexture } from "../assets/textures/smartTextures/line";
import { squareSmartTexture } from "../assets/textures/smartTextures/square";
import { starSmartTexture } from "../assets/textures/smartTextures/star";
import { triangleSmartTexture } from "../assets/textures/smartTextures/triangle";

// @ts-ignore
window.ige = ige;

export class AppClientScene extends IgeSceneGraph {
	classId = "AppClientScene";

	async addGraph () {
		const options = new IgeOptions();
		options.set("masterVolume", 1);

		ige.audio?.masterVolume(options.get("masterVolume", 1));

		new IgeCellSheet("smoke", "assets/textures/sprites/smoke.png", 2, 2);
		new IgeTexture("wood", "assets/textures/sprites/wood.png");
		new IgeTexture("book", "assets/textures/sprites/science.png");
		new IgeTexture("diamond", "assets/textures/sprites/diamond.png");
		new IgeTexture("stone", "assets/textures/sprites/stone.png");
		new IgeTexture("brick", "assets/textures/sprites/brick.png");
		new IgeTexture("uranium", "assets/textures/sprites/uranium.png");
		new IgeTexture("mystium", "assets/textures/sprites/mystium.png");
		new IgeTexture("water", "assets/textures/sprites/water.png");
		new IgeTexture("elerium", "assets/textures/sprites/elerium.png");
		new IgeTexture("gold", "assets/textures/sprites/gold.png");
		new IgeTexture("energy", "assets/textures/sprites/energy.png");
		new IgeTexture("science", "assets/textures/sprites/science.png");
		new IgeTexture("arrow", "assets/textures/sprites/arrow.png");
		new IgeTexture("blueCube", "assets/textures/sprites/blueCube.png");
		new IgeTexture("purpleCube", "assets/textures/sprites/purpleCube.png");
		new IgeTexture("whiteCube", "assets/textures/sprites/whiteCube.png");
		new IgeTexture("whiteTubeS", "assets/textures/sprites/whiteTubeS.png");
		new IgeTexture("whiteTubeL", "assets/textures/sprites/whiteTubeL.png");
		new IgeTexture("roofE", "assets/textures/sprites/roofE.png");
		new IgeTexture("roofW", "assets/textures/sprites/roofW.png");
		new IgeTexture("factory1", "assets/textures/sprites/factory1.png");
		new IgeTexture("factory2", "assets/textures/sprites/factory2.png");
		new IgeTexture("headquarters", "assets/textures/sprites/headquarters.png");
		new IgeTexture("mine", "assets/textures/sprites/mine.png");
		new IgeTexture("flag", "assets/textures/sprites/flag.png");
		new IgeTexture("house1", "assets/textures/sprites/house1.png");
		new IgeTexture("squareSmartTexture", squareSmartTexture);
		new IgeTexture("lineSmartTexture", lineSmartTexture);
		new IgeTexture("triangleSmartTexture", triangleSmartTexture);
		new IgeTexture("circleSmartTexture", circleSmartTexture);
		new IgeTexture("starSmartTexture", starSmartTexture);
		new IgeTexture("flagSmartTexture", flagSmartTexture);
		new IgeTexture("gridSmartTexture", gridSmartTexture);

		const network = ige.network as IgeNetIoClientController;

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

		vp1.drawBounds(true, true);
		vp1.drawBoundsData(true);

		vp1.camera.translateTo(0, 540, 0);

		await network.start("http://localhost:2000");
	}

	removeGraph () {
		const network = ige.network as IgeNetIoClientController;
		network.stop();
		ige.engine.stop();
	}
}
