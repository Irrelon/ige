import { IgeObject } from "@/engine/core/IgeObject";
import { IgeEntity } from "@/engine/core/IgeEntity";
export interface IgeSceneGraphDataEntry {
    text: string;
    id: string;
    classId: string;
    items?: IgeSceneGraphDataEntry[];
    parentId?: string;
    parent?: IgeObject | IgeEntity | null;
    obj?: IgeObject | IgeEntity | null;
}
