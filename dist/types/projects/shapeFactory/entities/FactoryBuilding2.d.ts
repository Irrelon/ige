import { Building } from "./base/Building";
import { IgeObject } from "@/engine/core/IgeObject";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";

export declare class FactoryBuilding2 extends Building {
	classId: string;
	tileXDelta: number;
	tileYDelta: number;
	tileW: number;
	tileH: number;
	constructor(
		tileX: number | undefined,
		tileY: number | undefined,
		produces: ResourceType,
		requires?: BuildingResourceRequirement[]
	);
	streamCreateConstructorArgs(): (number | ResourceType | BuildingResourceRequirement[])[];
	_mounted(obj: IgeObject): void;
}
