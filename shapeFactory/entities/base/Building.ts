import { GameEntity } from "./GameEntity";
import { registerClass } from "@/engine/igeClassStore";
import { Resource } from "../Resource";
import { ResourceType } from "../../enums/ResourceType";
import { BuildingResourceRequirement } from "../../types/BuildingResourceRequirement";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { isServer } from "@/engine/clientServer";
import { IgeTimeout } from "@/engine/core/IgeTimeout";
import { ige } from "@/engine/instance";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { FlagBuilding } from "../FlagBuilding";

export class Building extends GameEntity {
	flag?: FlagBuilding;
	outboundQueue: Resource[] = [];
	inboundQueue: Partial<Record<ResourceType, number>> = {};
	resourcePool: Partial<Record<ResourceType, number>> = {};

	_productionMinTimeMs: number = 10000;
	_productionMaxTimeMs: number = 20000;
	_isProducing: boolean = false;
	_produces: ResourceType;
	_requires: BuildingResourceRequirement[];

	constructor () {
		super();

		this._produces = ResourceType.none;
		this._requires = [];

		this.isometric(ige.data("isometric"));

		if (this.isometric()) {
			this.bounds3d(30, 30, 0);
			this.triggerPolygonFunctionName('bounds3dPolygon');
		}

		this.category("building");
	}

	_addResource (recordObj: Partial<Record<ResourceType, number>>, resourceType: ResourceType, amount: number = 1) {
		const currentVal = recordObj[resourceType] || 0;
		recordObj[resourceType] = currentVal + amount;
	}

	_subtractResource (recordObj: Partial<Record<ResourceType, number>>, resourceType: ResourceType, amount: number = 1) {
		const currentVal = recordObj[resourceType] || 0;
		recordObj[resourceType] = currentVal - amount;
	}

	productionMinTime (val?: number) {
		if (val === undefined) {
			return this._productionMinTimeMs;
		}

		this._productionMinTimeMs = val;
		return this;
	}

	productionMaxTime (val?: number) {
		if (val === undefined) {
			return this._productionMaxTimeMs;
		}

		this._productionMaxTimeMs = val;
		return this;
	}

	onResourceEnRoute (resourceType: ResourceType) {
		this._addResource(this.inboundQueue, resourceType, 1);
	}

	onResourceArrived (resourceType: ResourceType) {
		this._subtractResource(this.inboundQueue, resourceType, 1);
		this._addResource(this.resourcePool, resourceType, 1);
	}

	/**
	 * Returns true if the resource type is required at the moment.
	 * @param resourceType
	 */
	needsResource (resourceType: ResourceType): boolean {
		if (!this._requires.length) return false;

		// Check if this resource is one we accept in this building
		const needThisType = this._requires.find((tmpRequirement) => tmpRequirement.type === resourceType);
		if (!needThisType) return false;

		// Check the resource pool and inbound queue and see if we need any
		// more of this resource type
		const count = this.countAllResourcesByType(resourceType);

		if (needThisType.count > count) return true;
		return false;
	}

	countInboundResourcesByType (type: ResourceType): number {
		return this.inboundQueue[type] || 0;
	}

	countAvailableResourcesByType (type: ResourceType): number {
		return this.resourcePool[type] || 0;
	}

	countAllResourcesByType (type: ResourceType): number {
		return this.countInboundResourcesByType(type) + this.countAvailableResourcesByType(type);
	}

	canProduceResource (): boolean {
		// Check if this building produces anything
		if (this._produces === ResourceType.none) return false;

		// Check if we are already producing
		if (this._isProducing) return false;

		// Check all the resources we need are in our store
		for (let i = 0; i < this._requires.length; i++) {
			const requiredItem = this._requires[i];
			const count = this.countAvailableResourcesByType(requiredItem.type);

			if (requiredItem.count > count) {
				// We found a resource we need that hasn't been satisfied
				return false;
			}
		}

		return true;
	}

	startProducingResource () {
		// The building can produce
		this._isProducing = true;

		const diff = this._productionMaxTimeMs - this._productionMinTimeMs;
		const productionTime = Math.round(Math.random() * diff) + this._productionMinTimeMs;

		new IgeTimeout(() => {
			this.completeProducingResource();
		}, productionTime);
	}

	completeProducingResource () {
		// Subtract the required resources from the resource pool since we
		// consumed them to generate our product
		for (let i = 0; i < this._requires.length; i++) {
			const requiredItem = this._requires[i];
			this._subtractResource(this.resourcePool, requiredItem.type, requiredItem.count);
		}

		// Generate our new resource
		new Resource(this._produces, this.id())
			.translateTo(this._translate.x, this._translate.y, 0)
			.mount(ige.$("scene1") as IgeScene2d);

		this._isProducing = false;
	}

	_updateOnServer () {
		// Check if this building can produce the resource it makes
		if (!this.canProduceResource()) return;
		this.startProducingResource();
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		if (isServer) {
			this._updateOnServer();
		}
		super.update(ctx, tickDelta);
	}
}

registerClass(Building);
