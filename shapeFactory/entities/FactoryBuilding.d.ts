import { Triangle } from "./base/Triangle";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { FlagBuilding } from "./FlagBuilding";
export declare class FactoryBuilding extends Triangle {
    classId: string;
    flag?: FlagBuilding;
    constructor(produces: ResourceType, requires?: BuildingResourceRequirement[]);
    streamCreateConstructorArgs(): (ResourceType | BuildingResourceRequirement[])[];
}
