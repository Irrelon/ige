import IgeBaseClass from "./IgeBaseClass";

class IgeSceneGraph extends IgeBaseClass {
	classId = "IgeSceneGraph";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 * @param {Object=} options The options that were passed with the call
	 * to ige.addGraph().
	 */
	addGraph(options?: any) {}

	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph(options?: any) {}
}

export default IgeSceneGraph;
