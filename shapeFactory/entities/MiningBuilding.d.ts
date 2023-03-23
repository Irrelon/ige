import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { Star } from "./base/Star";
import { FlagBuilding } from "./FlagBuilding";
export declare class MiningBuilding extends Star {
    classId: string;
    flag?: FlagBuilding;
    constructor(produces: ResourceType, requires?: BuildingResourceRequirement[]);
    streamCreateConstructorArgs(): (ResourceType | BuildingResourceRequirement[])[];
}
