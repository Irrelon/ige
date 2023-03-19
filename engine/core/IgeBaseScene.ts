import {ige} from "../instance";
import { IgeSceneGraph } from "./IgeSceneGraph";
import { IgeScene2d } from "./IgeScene2d";
import { IgeViewport } from "./IgeViewport";

/**
 * When loaded into memory using ige.addGraph('IgeBaseScene') will create
 * the scene "baseScene" and the viewport "vp1" that are used in almost all
 * examples and can be used as the base for your scenegraph as well.
 */
export class IgeBaseScene extends IgeSceneGraph {
	classId = "IgeBaseScene";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph = () => {
		// Clear existing graph data
		if (ige.$("baseScene")) {
			this.removeGraph();
		}

		// Create the scene
		const baseScene = new IgeScene2d().id("baseScene");

		// Create the main viewport to look at "baseScene"
		new IgeViewport()
			.id("vp1")
			.autoSize(true)
			.scene(baseScene)
			.drawBounds(false)
			.drawBoundsData(false)
			.mount(ige.engine);
	};

	/**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
	removeGraph = () => {
		// Destroy the viewport
		ige.$("vp1")?.destroy();

		// Destroy the baseScene
		ige.$("baseScene")?.destroy();
	};
}
