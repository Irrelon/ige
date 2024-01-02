import { Building } from "./base/Building";
import { IgeObject } from "@/engine/core/IgeObject";
import { ResourceType } from "../enums/ResourceType";

export declare class StorageBuilding extends Building {
	classId: string;
	tileXDelta: number;
	tileYDelta: number;
	tileW: number;
	tileH: number;
	constructor(tileX?: number, tileY?: number);
	streamCreateConstructorArgs(): number[];
	/**
	 * Takes a resource from the resource pool and dumps it back onto the
	 * map for it to decide where to route itself.
	 */
	dispenseResource(type: ResourceType): void;
	_updateOnServer(): void;
	_mounted(obj: IgeObject): void;
}
