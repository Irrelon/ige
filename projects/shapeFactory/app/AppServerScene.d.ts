import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
export declare class AppServerScene extends IgeSceneGraph {
    classId: string;
    addGraph(): Promise<void>;
    removeGraph(): void;
}
