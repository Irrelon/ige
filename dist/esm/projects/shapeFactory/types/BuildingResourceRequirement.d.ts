import { ResourceType } from "../enums/ResourceType";

export interface BuildingResourceRequirement {
	type: ResourceType;
	count: number;
	max: number;
}
