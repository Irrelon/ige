import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { ResourceType } from "../enums/ResourceType";
export declare class UiResourcesPile extends IgeUiElement {
    resources: Partial<Record<ResourceType, number>>;
    constructor();
    addResource(type: ResourceType): void;
    removeResource(type: ResourceType): void;
}
