import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { IgeObject } from "@/engine/core/IgeObject";
import { Building } from "./base/Building";
export declare class HouseBuilding1 extends Building {
    classId: string;
    constructor(tileX: number | undefined, tileY: number | undefined, produces: ResourceType, requires?: BuildingResourceRequirement[]);
    streamCreateConstructorArgs(): (number | ResourceType | BuildingResourceRequirement[])[];
    _mounted(obj: IgeObject): void;
}
