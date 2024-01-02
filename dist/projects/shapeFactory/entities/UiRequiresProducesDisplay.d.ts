import { IgeUiEntity } from "../../../engine/core/IgeUiEntity.js"
import { ResourceType } from "../enums/ResourceType.js"
import type { BuildingResourceRequirement } from "../types/BuildingResourceRequirement.js"
export declare class UiRequiresProducesDisplay extends IgeUiEntity {
    _requiredResourceUiEntity: IgeUiEntity[];
    constructor(produces: ResourceType, requires?: BuildingResourceRequirement[]);
}
