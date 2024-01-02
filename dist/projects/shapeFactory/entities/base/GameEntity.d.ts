import { IgeEntity } from "../../../../engine/core/IgeEntity.js"
import type { IgeObject } from "../../../../engine/core/IgeObject.js"
export declare class GameEntity extends IgeEntity {
    constructor();
    mount(obj: IgeObject): this;
    onStreamProperty(propName: string, propVal: any): this;
}
