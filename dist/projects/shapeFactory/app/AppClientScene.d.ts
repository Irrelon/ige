import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js"
export declare class AppClientScene extends IgeSceneGraph {
    classId: string;
    addGraph(): Promise<void>;
    removeGraph(): void;
}
