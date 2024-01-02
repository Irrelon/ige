import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js"
export declare class DefaultLevel extends IgeSceneGraph {
    classId: string;
    /**
     * Called when loading the graph data via ige.addGraph().
     * @param options
     */
    addGraph(options: any): Promise<void>;
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph(): Promise<void>;
}
