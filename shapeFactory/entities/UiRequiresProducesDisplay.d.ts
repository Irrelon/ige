import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
export declare class UiRequiresProducesDisplay extends IgeUiElement {
    constructor(produces: ResourceType, requires?: BuildingResourceRequirement[]);
}
