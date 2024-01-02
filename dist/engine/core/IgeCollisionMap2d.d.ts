import { IgeEntity } from "./IgeEntity.js"
import { IgeMap2d } from "./IgeMap2d.js"
export declare class IgeCollisionMap2d extends IgeEntity {
    classId: string;
    map: IgeMap2d;
    constructor();
    mapData(val?: number[][]): number[][] | this;
}
