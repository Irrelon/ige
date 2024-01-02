import { Building } from "./base/Building.js"
import type { IgeObject } from "../../../engine/core/IgeObject.js"
import type { ResourceType } from "../enums/ResourceType.js"
import type { BuildingResourceRequirement } from "../types/BuildingResourceRequirement.js"
export declare class FactoryBuilding2 extends Building {
    classId: string;
    tileXDelta: number;
    tileYDelta: number;
    tileW: number;
    tileH: number;
    constructor(tileX: number | undefined, tileY: number | undefined, produces: ResourceType, requires?: BuildingResourceRequirement[]);
    streamCreateConstructorArgs(): (number | ResourceType | BuildingResourceRequirement[])[];
    _mounted(obj: IgeObject): void;
}
