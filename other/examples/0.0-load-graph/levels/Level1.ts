import type { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { ige } from "@/engine/exports";
import { Fairy } from "../entities/Fairy";

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
		const scene1 = new IgeScene2d().id("scene1").mount(baseScene);

		// Create an entity and mount it to the scene
		new Fairy(-0.01).translateTo(-220, 0, 0).mount(scene1);

		new Fairy(0.01).translateTo(220, 0, 0).mount(scene1);
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
