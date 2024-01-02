import { GameEntity } from "./GameEntity";
import { IgeParticleEmitter } from "@/engine/core/IgeParticleEmitter";
import { ThreadSafeQueue } from "../../services/ThreadSafeQueue";
import { ResourceType } from "../../enums/ResourceType";
import { BuildingResourceRequirement } from "../../types/BuildingResourceRequirement";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { FlagBuilding } from "../FlagBuilding";
import { Resource } from "../Resource";
import { UiRequiresProducesDisplay } from "../UiRequiresProducesDisplay";

export declare class Building extends GameEntity {
	flag?: FlagBuilding;
	outboundQueue: ThreadSafeQueue<Resource>;
	inboundQueue: Partial<Record<ResourceType, number>>;
	resourcePool: Partial<Record<ResourceType, number>>;
	tileX: number;
	tileY: number;
	tileXDelta: number;
	tileYDelta: number;
	tileW: number;
	tileH: number;
	_productionMinTimeMs: number;
	_productionMaxTimeMs: number;
	_isProducing: boolean;
	_produces: ResourceType;
	_requires: BuildingResourceRequirement[];
	productionEffects: IgeParticleEmitter[];
	uiResourceDisplay?: UiRequiresProducesDisplay;
	constructor();
	_addResource(recordObj: Partial<Record<ResourceType, number>>, resourceType: ResourceType, amount?: number): void;
	_subtractResource(
		recordObj: Partial<Record<ResourceType, number>>,
		resourceType: ResourceType,
		amount?: number
	): void;
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
	streamSectionData(
		sectionId: string,
		data?: string,
		bypassTimeStream?: boolean,
		bypassChangeDetection?: boolean
	): string | undefined;
	updateProductionEffects(): void;
}
