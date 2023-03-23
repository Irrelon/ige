import { GameEntity } from "./GameEntity";
import { Resource } from "../Resource";
import { ResourceType } from "../../enums/ResourceType";
import { BuildingResourceRequirement } from "../../types/BuildingResourceRequirement";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
export declare class Building extends GameEntity {
    outboundQueue: Resource[];
    inboundQueue: ResourceType[];
    resourcePool: ResourceType[];
    _produces: ResourceType;
    _requires: BuildingResourceRequirement[];
    constructor();
    onResourceEnRoute(resourceType: ResourceType): void;
    onResourceArrived(resourceType: ResourceType): void;
    /**
     * Returns true if the resource type is required at the moment.
     * @param resourceType
     */
    needsResource(resourceType: ResourceType): boolean;
    canProduceResource(): boolean;
    _updateOnServer(): void;
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
}
