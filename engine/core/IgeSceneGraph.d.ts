import IgeBaseClass from "./IgeBaseClass";
declare class IgeSceneGraph extends IgeBaseClass {
    classId: string;
    /**
     * Called when loading the graph data via ige.addGraph().
     * @param {Object=} options The options that were passed with the call
     * to ige.addGraph().
     */
    addGraph(options?: any): void;
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph(options?: any): void;
}
export default IgeSceneGraph;
