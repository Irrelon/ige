import { IgeUiEntity } from "../../../engine/core/IgeUiEntity.js"
import type { ResourceType } from "../enums/ResourceType.js"
export declare class UiResourcesPile extends IgeUiEntity {
    resources: Partial<Record<ResourceType, number>>;
    constructor();
    addResource(type: ResourceType): void;
    removeResource(type: ResourceType): void;
}
