import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";

export declare class AppClientScene extends IgeSceneGraph {
	classId: string;
	addGraph(): Promise<void>;
	removeGraph(): void;
}
