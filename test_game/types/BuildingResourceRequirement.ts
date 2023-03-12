import { ResourceType } from "../enums/ResourceType";

export interface BuildingResourceRequirement {
	resource: ResourceType;
	count: number;
}