import { GameEntity } from "./GameEntity.js";
import { registerClass } from "../../../engine/igeClassStore.js";
import { Resource } from "../Resource.js";
import { ResourceType } from "../../enums/ResourceType.js";
import { isServer } from "../../../engine/clientServer.js";
import { IgeTimeout } from "../../../engine/core/IgeTimeout.js";
import { ige } from "../../../engine/instance.js";
export class Building extends GameEntity {
    constructor() {
        super();
        this.outboundQueue = [];
        this.inboundQueue = {};
        this.resourcePool = {};
        this._timeToProduceMs = 10000;
        this._isProducing = false;
        this._produces = ResourceType.none;
        this._requires = [];
        this.category("building");
    }
    _addResource(recordObj, resourceType, amount = 1) {
        const currentVal = recordObj[resourceType] || 0;
        recordObj[resourceType] = currentVal + amount;
    }
    _subtractResource(recordObj, resourceType, amount = 1) {
        const currentVal = recordObj[resourceType] || 0;
        recordObj[resourceType] = currentVal - amount;
    }
    onResourceEnRoute(resourceType) {
        this._addResource(this.inboundQueue, resourceType, 1);
    }
    onResourceArrived(resourceType) {
        this._subtractResource(this.inboundQueue, resourceType, 1);
        this._addResource(this.resourcePool, resourceType, 1);
    }
    /**
     * Returns true if the resource type is required at the moment.
     * @param resourceType
     */
    needsResource(resourceType) {
        if (!this._requires.length)
            return false;
        // Check if this resource is one we accept in this building
        const needThisType = this._requires.find((tmpRequirement) => tmpRequirement.type === resourceType);
        if (!needThisType)
            return false;
        // Check the resource pool and inbound queue and see if we need any
        // more of this resource type
        const count = this.countAllResourcesByType(resourceType);
        if (needThisType.count > count)
            return true;
        return false;
    }
    countInboundResourcesByType(type) {
        return this.inboundQueue[type] || 0;
    }
    countAvailableResourcesByType(type) {
        return this.resourcePool[type] || 0;
    }
    countAllResourcesByType(type) {
        return this.countInboundResourcesByType(type) + this.countAvailableResourcesByType(type);
    }
    canProduceResource() {
        // Check if we are already producing
        if (this._isProducing)
            return false;
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
    startProducingResource() {
        // The building can produce
        this._isProducing = true;
        new IgeTimeout(() => {
            this.completeProducingResource();
        }, this._timeToProduceMs);
    }
    completeProducingResource() {
        // Subtract the required resources from the resource pool since we
        // consumed them to generate our product
        for (let i = 0; i < this._requires.length; i++) {
            const requiredItem = this._requires[i];
            this._subtractResource(this.resourcePool, requiredItem.type, requiredItem.count);
        }
        // Generate our new resource
        new Resource(this._produces, this.id())
            .translateTo(this._translate.x, this._translate.y, 0)
            .mount(ige.$("scene1"));
        this._isProducing = false;
    }
    _updateOnServer() {
        // Check if this building can produce the resource it makes
        if (!this.canProduceResource())
            return;
        this.startProducingResource();
    }
    update(ctx, tickDelta) {
        if (isServer) {
            this._updateOnServer();
        }
        super.update(ctx, tickDelta);
    }
}
registerClass(Building);
