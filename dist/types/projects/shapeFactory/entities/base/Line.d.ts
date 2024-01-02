import { GameEntity } from "./GameEntity";
import { IgeRect } from "@/engine/core/IgeRect";

export declare class Line extends GameEntity {
	classId: string;
	_initVals?: IgeRect;
	constructor(x1?: number, y1?: number, x2?: number, y2?: number);
	setLine(x1: number, y1: number, x2: number, y2: number): void;
}
