import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
export declare class UiRequiresProducesDisplay extends IgeUiEntity {
    constructor(produces: ResourceType, requires?: BuildingResourceRequirement[]);
}
