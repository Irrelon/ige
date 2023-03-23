import { GameEntity } from "./GameEntity";
import { registerClass } from "@/engine/igeClassStore";
import { Resource } from "../Resource";
import { ResourceType } from "../../enums/ResourceType";
import { BuildingResourceRequirement } from "../../types/BuildingResourceRequirement";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { isServer } from "@/engine/clientServer";
import { arrPull } from "@/engine/utils";

export class Building extends GameEntity {
	outboundQueue: Resource[] = [];
	inboundQueue: ResourceType[] = [];
	resourcePool: ResourceType[] = [];

	_produces: ResourceType;
	_requires: BuildingResourceRequirement[];

	constructor () {
		super();

		this._produces = ResourceType.none;
		this._requires = [];

		this.category("building");
	}

	onResourceEnRoute (resourceType: ResourceType) {
		this.inboundQueue.push(resourceType);
	}

	onResourceArrived (resourceType: ResourceType) {
		arrPull(this.inboundQueue ,resourceType);
		this.resourcePool.push(resourceType);
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
		const count = this.resourcePool.filter((tmpResourceType) => tmpResourceType === resourceType).length + this.inboundQueue.filter((tmpResourceType) => tmpResourceType === resourceType).length;

		if (needThisType.count > count) return true;

		return false;
	}

	canProduceResource (): boolean {
		// Check all the resources we need are in our store
		return false;
	}

	_updateOnServer () {
		// Check if this building can produce the resource it makes
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		if (isServer) {
			this._updateOnServer();
		}
		super.update(ctx, tickDelta);
	}
}

registerClass(Building);
