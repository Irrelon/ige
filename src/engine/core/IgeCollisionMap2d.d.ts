import { IgeEntity } from "./IgeEntity";
import type { IgeMap2d } from "./IgeMap2d";

export declare class IgeCollisionMap2d extends IgeEntity {
	classId: string;
	map: IgeMap2d;
	constructor();
	mapData(val?: number[][]): number[][] | this;
}
