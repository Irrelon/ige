import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeObject } from "@/engine/core/IgeObject";

export interface IgeSceneGraphDataEntry {
	text: string;
	id: string;
	classId: string;
	items?: IgeSceneGraphDataEntry[];
	parentId?: string;
	parent?: IgeObject | IgeEntity | null;
	obj?: IgeObject | IgeEntity | null;
}
