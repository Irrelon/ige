import { GameEntity } from "./GameEntity";
import { Resource } from "../Resource";
import { ResourceType } from "../../enums/ResourceType";
import { BuildingResourceRequirement } from "../../types/BuildingResourceRequirement";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { FlagBuilding } from "../FlagBuilding";
export declare class Building extends GameEntity {
    flag?: FlagBuilding;
    outboundQueue: Resource[];
    inboundQueue: Partial<Record<ResourceType, number>>;
    resourcePool: Partial<Record<ResourceType, number>>;
    _productionMinTimeMs: number;
    _productionMaxTimeMs: number;
    _isProducing: boolean;
    _produces: ResourceType;
    _requires: BuildingResourceRequirement[];
    constructor();
    _addResource(recordObj: Partial<Record<ResourceType, number>>, resourceType: ResourceType, amount?: number): void;
    _subtractResource(recordObj: Partial<Record<ResourceType, number>>, resourceType: ResourceType, amount?: number): void;
    productionMinTime(val?: number): number | this;
    productionMaxTime(val?: number): number | this;
    onResourceEnRoute(resourceType: ResourceType): void;
    onResourceArrived(resourceType: ResourceType): void;
    /**
     * Returns true if the resource type is required at the moment.
     * @param resourceType
     */
    needsResource(resourceType: ResourceType): boolean;
    countInboundResourcesByType(type: ResourceType): number;
    countAvailableResourcesByType(type: ResourceType): number;
    countAllResourcesByType(type: ResourceType): number;
    canProduceResource(): boolean;
    startProducingResource(): void;
    completeProducingResource(): void;
    _updateOnServer(): void;
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
}
