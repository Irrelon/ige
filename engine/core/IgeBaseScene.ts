import { IgeSceneGraph } from "./IgeSceneGraph";
import { IgeViewport } from "./IgeViewport";

/**
 * When loaded into memory using this._ige.addGraph('IgeBaseScene') will create
 * the scene "baseScene" and the viewport "vp1" that are used in almost all
 * examples and can be used as the base for your scenegraph as well.
 */
export class IgeBaseScene extends IgeSceneGraph {
    _classId = "IgeBaseScene";

    constructor(props) {
        super(props);
    }

    /**
     * Called when loading the graph data via this._ige.addGraph().
     */
    addGraph() {
        // Clear existing graph data
        if (this._ige.$("baseScene")) {
            this.removeGraph();
        }

        // Create the scene
        const baseScene = new IgeScene2d().id("baseScene");

        // Create the main viewport to look at "baseScene"
        new IgeViewport({ ige: this._ige, igeConfig: this._igeConfig })
            .id("vp1")
            .autoSize(true)
            .scene(baseScene)
            .drawBounds(false)
            .mount(ige);
    }

    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph() {
        // Destroy the viewport
        this._ige.$("vp1").destroy();

        // Destroy the baseScene
        this._ige.$("baseScene").destroy();
    }
}
