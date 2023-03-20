import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { Star } from "./base/Star";
export declare class FactoryBuilding extends Star {
    classId: string;
    _produces: ResourceType;
    _requires: BuildingResourceRequirement[];
    constructor(produces: ResourceType, requires?: BuildingResourceRequirement[]);
    streamCreateConstructorArgs(): (ResourceType | BuildingResourceRequirement[])[];
}
