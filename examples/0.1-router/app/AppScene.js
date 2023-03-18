import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js";
import { ige } from "../../../engine/instance.js";
import { IgeBaseScene } from "../../../engine/core/IgeBaseScene.js";
export class AppScene extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "AppScene";
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        // Creates "baseScene" and adds a viewport
        ige.engine.addGraph(IgeBaseScene);
    }
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph() {
        // Removes the { IgeBaseScene } from the scenegraph
        ige.engine.removeGraph(IgeBaseScene);
    }
}
