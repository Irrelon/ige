import { Building } from "./base/Building";
import { IgeObject } from "@/engine/core/IgeObject";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";

export declare class MiningBuilding extends Building {
	classId: string;
	constructor(
		tileX: number | undefined,
		tileY: number | undefined,
		produces: ResourceType,
		requires?: BuildingResourceRequirement[]
	);
	streamCreateConstructorArgs(): (number | ResourceType | BuildingResourceRequirement[])[];
	_mounted(obj: IgeObject): void;
}
