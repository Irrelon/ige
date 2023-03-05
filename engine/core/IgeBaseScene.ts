/**
 * When loaded into memory using ige.addGraph('IgeBaseScene') will create
 * the scene "baseScene" and the viewport "vp1" that are used in almost all
 * examples and can be used as the base for your scenegraph as well.
 */
import IgeSceneGraph from "./IgeSceneGraph";

class IgeBaseScene extends IgeSceneGraph {
	classId = "IgeBaseScene";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 * @param options
	 */
	addGraph = () => {
		// Clear existing graph data
		if (ige.engine.$("baseScene")) {
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
		ige.engine.$("vp1").destroy();

		// Destroy the baseScene
		ige.engine.$("baseScene").destroy();
	}
}

export default IgeBaseScene;
