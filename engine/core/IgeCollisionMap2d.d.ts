import { IgeEntity } from "./IgeEntity";
import { IgeMap2d } from "./IgeMap2d";
export declare class IgeCollisionMap2d extends IgeEntity {
    classId: string;
    map: IgeMap2d;
    constructor();
    mapData(val?: number[][]): this | number[][];
}
