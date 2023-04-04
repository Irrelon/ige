import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { Star } from "./base/Star";
export declare class MiningBuilding extends Star {
    classId: string;
    constructor(produces: ResourceType, requires?: BuildingResourceRequirement[]);
    streamCreateConstructorArgs(): (ResourceType | BuildingResourceRequirement[])[];
}
