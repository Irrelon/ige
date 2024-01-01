import { IgeSceneGraph } from "./IgeSceneGraph";
/**
 * When loaded into memory using ige.addGraph('IgeBaseScene') will create
 * the scene "baseScene" and the viewport "vp1" that are used in almost all
 * examples and can be used as the base for your scenegraph as well.
 */
export declare class IgeBaseScene extends IgeSceneGraph {
    classId: string;
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph: () => void;
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph: () => void;
}
