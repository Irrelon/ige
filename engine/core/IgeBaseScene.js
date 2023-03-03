import IgeSceneGraph from "./IgeSceneGraph.js";
import IgeScene2d from "./IgeScene2d.js";
import IgeViewport from "./IgeViewport.js";
import { ige } from "../instance.js";
/**
 * When loaded into memory using ige.addGraph('IgeBaseScene') will create
 * the scene "baseScene" and the viewport "vp1" that are used in almost all
 * examples and can be used as the base for your scenegraph as well.
 */
class IgeBaseScene extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "IgeBaseScene";
        /**
         * Called when loading the graph data via ige.addGraph().
         * @param options
         */
        this.addGraph = () => {
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
                .mount(ige.root);
        };
        /**
         * The method called when the graph items are to be removed from the
         * active graph.
         */
        this.removeGraph = () => {
            // Destroy the viewport
            ige.$("vp1").destroy();
            // Destroy the baseScene
            ige.$("baseScene").destroy();
        };
    }
}
export default IgeBaseScene;
