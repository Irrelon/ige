import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
export declare class SplashScene extends IgeSceneGraph {
    classId: string;
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph(): void;
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph(): void;
}
