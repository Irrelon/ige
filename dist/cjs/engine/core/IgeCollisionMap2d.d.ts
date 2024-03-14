import { IgeEntity } from "../../export/exports.js"
import { IgeMap2d } from "../../export/exports.js"
export declare class IgeCollisionMap2d extends IgeEntity {
    classId: string;
    map: IgeMap2d;
    constructor();
    mapData(val?: number[][]): any[][] | this;
}
