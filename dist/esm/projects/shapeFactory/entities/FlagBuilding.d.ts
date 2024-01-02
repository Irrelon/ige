import { Building } from "./base/Building";
import { IgeObject } from "@/engine/core/IgeObject";

export declare class FlagBuilding extends Building {
	classId: string;
	constructor(tileX?: number, tileY?: number);
	streamCreateConstructorArgs(): number[];
	_mounted(obj: IgeObject): void;
}
