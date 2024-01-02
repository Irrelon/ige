import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
import { ResourceType } from "../enums/ResourceType";

export declare class UiResourcesPile extends IgeUiEntity {
	resources: Partial<Record<ResourceType, number>>;
	constructor();
	addResource(type: ResourceType): void;
	removeResource(type: ResourceType): void;
}
