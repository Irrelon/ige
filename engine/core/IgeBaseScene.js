import { ige } from "../instance";
import { IgeSceneGraph } from "./IgeSceneGraph";
import { IgeScene2d } from "./IgeScene2d";
import { IgeViewport } from "./IgeViewport";
/**
 * When loaded into memory using ige.addGraph('IgeBaseScene') will create
 * the scene "baseScene" and the viewport "vp1" that are used in almost all
 * examples and can be used as the base for your scenegraph as well.
 */
export class IgeBaseScene extends IgeSceneGraph {
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
                .mount(ige.engine);
        };
        /**
         * The method called when the graph items are to be removed from the
         * active graph.
         */
        this.removeGraph = () => {
            var _a, _b;
            // Destroy the viewport
            (_a = ige.$("vp1")) === null || _a === void 0 ? void 0 : _a.destroy();
            // Destroy the baseScene
            (_b = ige.$("baseScene")) === null || _b === void 0 ? void 0 : _b.destroy();
        };
    }
}
