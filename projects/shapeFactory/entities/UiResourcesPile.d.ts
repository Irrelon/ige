import { ResourceType } from "../enums/ResourceType";
import { IgeUiEntity } from "../../../engine/core/IgeUiEntity";
export declare class UiResourcesPile extends IgeUiEntity {
    resources: Partial<Record<ResourceType, number>>;
    constructor();
    addResource(type: ResourceType): void;
    removeResource(type: ResourceType): void;
}
