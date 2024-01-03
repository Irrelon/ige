import type { IgeEntity } from "../engine/core/IgeEntity.js"
import type { IgeObject } from "../engine/core/IgeObject.js"
export interface IgeSceneGraphDataEntry {
    text: string;
    id: string;
    classId: string;
    items?: IgeSceneGraphDataEntry[];
    parentId?: string;
    parent?: IgeObject | IgeEntity | null;
    obj?: IgeObject | IgeEntity | null;
}
