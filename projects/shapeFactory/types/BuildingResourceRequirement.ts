import { ResourceType } from "../enums/ResourceType";

export interface BuildingResourceRequirement {
	type: ResourceType;
	count: number; // The amount needed of this type to produce the building's output resource
	max: number; // The maximum amount of this type that we can store in the building
}
