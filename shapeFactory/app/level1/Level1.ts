import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { IgeStreamMode } from "@/enums/IgeStreamMode";
import { ResourceType } from "../../enums/ResourceType";
import { IgeAudioEntity } from "@/engine/audio";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { createStorageBuilding } from "../../services/createBuilding";
import { Grid } from "../../entities/Grid";
import { Cuboid } from "@/examples/14.1-isoobjects/gameClasses/Cuboid";

export class Level1 extends IgeSceneGraph {
	classId = "Level1";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph () {
		const baseScene = ige.$("baseScene") as IgeScene2d;

		// Clear existing graph data
		if (ige.$("scene1")) {
			this.removeGraph();
		}

		// Create the scene
		const scene1 = new IgeScene2d()
			.id("scene1")
			.isometricMounts(true)
			.mount(baseScene);

		const grid = new Grid().mount(baseScene);

		const cuboid = new Cuboid(null, null)
			.depth(1)
			.streamMode(1)
			.translateTo(0, 0, 0)
			.bounds3d(200, 200, 10)
			.pointerEventsActive(true)
			.triggerPolygon('bounds3dPolygon')
			.mount(scene1);

		if (isClient) return;

		new IgeAudioEntity()
			.streamMode(IgeStreamMode.simple)
			.url("assets/audio/deepSpace.mp3")
			.play(true)
			.mount(baseScene);

		const base = createStorageBuilding(scene1, "base1", 0, 0);

		base.resourcePool[ResourceType.energy] = 10;
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
