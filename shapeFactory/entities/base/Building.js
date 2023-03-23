import { GameEntity } from "./GameEntity.js";
import { registerClass } from "../../../engine/igeClassStore.js";
import { ResourceType } from "../../enums/ResourceType.js";
import { isServer } from "../../../engine/clientServer.js";
import { arrPull } from "../../../engine/utils.js";
export class Building extends GameEntity {
    constructor() {
        super();
        this.outboundQueue = [];
        this.inboundQueue = [];
        this.resourcePool = [];
        this._produces = ResourceType.none;
        this._requires = [];
        this.category("building");
    }
    onResourceEnRoute(resourceType) {
        this.inboundQueue.push(resourceType);
    }
    onResourceArrived(resourceType) {
        arrPull(this.inboundQueue, resourceType);
        this.resourcePool.push(resourceType);
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
        const count = this.resourcePool.filter((tmpResourceType) => tmpResourceType === resourceType).length + this.inboundQueue.filter((tmpResourceType) => tmpResourceType === resourceType).length;
        if (needThisType.count > count)
            return true;
        return false;
    }
    canProduceResource() {
        // Check all the resources we need are in our store
        return false;
    }
    _updateOnServer() {
        // Check if this building can produce the resource it makes
    }
    update(ctx, tickDelta) {
        if (isServer) {
            this._updateOnServer();
        }
        super.update(ctx, tickDelta);
    }
}
registerClass(Building);
