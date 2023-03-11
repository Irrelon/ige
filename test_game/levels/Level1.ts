import { ige } from "../../engine/instance";
import { degreesToRadians } from "../../engine/services/utils";
import IgeSceneGraph from "../../engine/core/IgeSceneGraph";
import IgeScene2d from "../../engine/core/IgeScene2d";
import IgeEntity from "../../engine/core/IgeEntity";
import { Square } from "../entities/Square";
import { Circle } from "../entities/Circle";
import { Triangle } from "../entities/Triangle";
import { Line } from "../entities/Line";
import { IgeStreamMode } from "../../enums/IgeStreamMode";
import { IgeAudioEntity } from "../../engine/components/audio/IgeAudioEntity";
import { Worker } from "../entities/Worker";

export class Level1 extends IgeSceneGraph {
	classId = "Level1";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph () {
		const baseScene = ige.$("baseScene") as IgeEntity;

		// Clear existing graph data
		if (ige.$("scene1")) {
			this.removeGraph();
		}

		// Create the scene
		const scene1 = new IgeScene2d()
			.id("scene1")
			.mount(baseScene);

		//if (isClient) return;

		new IgeAudioEntity()
			.streamMode(IgeStreamMode.simple)
			.url("assets/audio/deepSpace.mp3")
			.play(true)
			.mount(baseScene);

		const base = new Square()
			.translateTo(0, 0, 0)
			.mount(scene1);

		const industry2 = new Circle()
			.translateTo(250, -50, 0)
			.mount(scene1);

		const factory1 = new Triangle()
			.translateTo(220, 120, 0)
			.rotateTo(0, 0, degreesToRadians(-10))
			.mount(scene1);

		const industry1 = new Circle()
			.translateTo(50, 150, 0)
			.mount(scene1);

		new Line(0, 0, 250, -50)
			.mount(scene1);

		new Line(250, -50, 220, 120)
			.mount(scene1);

		new Line(220, 120, 50, 150)
			.mount(scene1);

		new Worker(industry1, factory1)
			.translateTo(220, 120, 0)
			.mount(scene1);
	}

	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph () {
		// Since all our objects in addGraph() were mounted to the
		// 'scene1' entity, destroying it will remove everything we
		// added to it.
		(ige.$("scene1") as IgeScene2d).destroy();
	}
}
