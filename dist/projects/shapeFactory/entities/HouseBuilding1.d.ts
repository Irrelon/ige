import { Building } from "./base/Building.js"
import type { IgeObject } from "../../../engine/core/IgeObject.js"
import type { ResourceType } from "../enums/ResourceType.js"
import type { BuildingResourceRequirement } from "../types/BuildingResourceRequirement.js"
import type { IgeCanvasRenderingContext2d } from "../../../types/IgeCanvasRenderingContext2d.js"
export declare class HouseBuilding1 extends Building {
    classId: string;
    constructor(tileX: number | undefined, tileY: number | undefined, produces: ResourceType, requires?: BuildingResourceRequirement[]);
    streamCreateConstructorArgs(): (number | ResourceType | BuildingResourceRequirement[])[];
    _mounted(obj: IgeObject): void;
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
}
