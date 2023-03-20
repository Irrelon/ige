import { Triangle } from "./base/Triangle";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
export declare class ResourceBuilding extends Triangle {
    classId: string;
    _produces: ResourceType;
    _requires: BuildingResourceRequirement[];
    constructor(produces: ResourceType, requires?: BuildingResourceRequirement[]);
    streamCreateConstructorArgs(): (ResourceType | BuildingResourceRequirement[])[];
}
