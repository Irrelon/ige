import type { ResourceType } from "../enums/ResourceType.js"
export interface BuildingResourceRequirement {
    type: ResourceType;
    count: number;
    max: number;
}
