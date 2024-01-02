import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js"
export declare class AppServerScene extends IgeSceneGraph {
    classId: string;
    addGraph(): Promise<void>;
    removeGraph(): void;
}
