import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
import { ResourceType } from "../enums/ResourceType";
import { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";

export declare class UiRequiresProducesDisplay extends IgeUiEntity {
	_requiredResourceUiEntity: IgeUiEntity[];
	constructor(produces: ResourceType, requires?: BuildingResourceRequirement[]);
}
