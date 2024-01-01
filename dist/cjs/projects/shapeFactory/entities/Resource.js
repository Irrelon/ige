"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resource = void 0;
const instance_1 = require("@/engine/instance");
const ResourceType_1 = require("../enums/ResourceType");
const igeClassStore_1 = require("@/engine/igeClassStore");
const IgeTimeout_1 = require("@/engine/core/IgeTimeout");
const clientServer_1 = require("@/engine/clientServer");
const roadPathFinder_1 = require("../services/roadPathFinder");
const utils_1 = require("@/engine/utils");
const resource_1 = require("../services/resource");
const GameEntity_1 = require("./base/GameEntity");
class Resource extends GameEntity_1.GameEntity {
    constructor(type, locationId) {
        super();
        this._destinationId = "";
        this._pathIds = [];
        this.layer(3);
        this.data("fillColor", resource_1.fillColorByResourceType[type])
            .width(16)
            .height(16);
        this.category("resource");
        this.isometric(instance_1.ige.data("isometric"));
        //this.bounds3d(10, 10, 2);
        this._type = type;
        this._locationId = locationId;
        if (clientServer_1.isClient) {
            if (type === ResourceType_1.ResourceType.elerium) {
                this.texture(instance_1.ige.textures.get("elerium"));
            }
            if (type === ResourceType_1.ResourceType.uranium) {
                this.texture(instance_1.ige.textures.get("uranium"));
            }
            if (type === ResourceType_1.ResourceType.wood) {
                this.texture(instance_1.ige.textures.get("wood"));
            }
            if (type === ResourceType_1.ResourceType.stone) {
                this.texture(instance_1.ige.textures.get("stone"));
            }
            if (type === ResourceType_1.ResourceType.science) {
                this.texture(instance_1.ige.textures.get("science"));
            }
            if (type === ResourceType_1.ResourceType.energy) {
                this.texture(instance_1.ige.textures.get("energy"));
            }
            if (type === ResourceType_1.ResourceType.gold) {
                this.texture(instance_1.ige.textures.get("gold"));
            }
            if (type === ResourceType_1.ResourceType.brick) {
                this.texture(instance_1.ige.textures.get("brick"));
            }
        }
        if (clientServer_1.isServer) {
            this.selectDestination();
            this.setNavigation();
        }
    }
    streamCreateConstructorArgs() {
        return [this._type, this._locationId];
    }
    selectDestination() {
        this._destinationId = "base1"; // The destination when no other building needs the resource at the moment
        // Check buildings to see if any need this resource at the moment
        const buildings = instance_1.ige.$$("building");
        // If we have no buildings to scan, return, since destination will be the base
        if (!buildings.length)
            return;
        // Scan each building and ask if it needs this resource and if so, determine the closest one
        const needyList = buildings.filter((tmpBuilding) => tmpBuilding.needsResource(this._type));
        // If we have no buildings to send the resource to, return, since destination will be the base
        if (!needyList.length)
            return;
        //console.log(`Current ${ResourceType[this._type]} count`, needyList[0].id(), needyList[0].countAllResourcesByType(this._type));
        const distances = {};
        needyList.forEach((tmpBuilding) => {
            distances[tmpBuilding.id()] = (0, utils_1.distance)(this._translate.x, this._translate.y, tmpBuilding._translate.x, tmpBuilding._translate.y);
        });
        // Sort the needy list by distance
        needyList.sort((a, b) => {
            return distances[a.id()] < distances[b.id()] ? -1 : 1;
        });
        const buildingWeWillDeliverTo = needyList[0];
        // Tell the building we are going to route the resource to it
        buildingWeWillDeliverTo.onResourceEnRoute(this._type);
        this._destinationId = buildingWeWillDeliverTo.id();
    }
    setNavigation() {
        if (this._destinationId) {
            this._location = instance_1.ige.$(this._locationId);
            this._destination = instance_1.ige.$(this._destinationId);
        }
        if (!this._location || !this._destination) {
            // Create a timeout to re-check
            new IgeTimeout_1.IgeTimeout(() => {
                this.setNavigation();
            }, 200);
            return;
        }
        this.onDropped(this._locationId);
    }
    onDropped(droppedLocationId) {
        var _a;
        this._location = instance_1.ige.$(droppedLocationId);
        this._locationId = droppedLocationId;
        if (!this._location) {
            // Couldn't get current location, re-queue the check
            new IgeTimeout_1.IgeTimeout(() => {
                this.onDropped(droppedLocationId);
            }, 1000);
            return;
        }
        //console.log("Resource is located at", this._locationId);
        //console.log("Resource wants to get to", this._destinationId);
        if (this._locationId === this._destinationId) {
            //console.log("We got to our destination!");
            this._pathIds = [];
            // Tell the destination building we have arrived
            (_a = this._destination) === null || _a === void 0 ? void 0 : _a.onResourceArrived(this._type);
            // Destroy the resource
            this.destroy();
            return;
        }
        this.calculateTransportPath();
    }
    calculateTransportPath() {
        if (!this._location) {
            debugger;
            console.log("Resource cannot calculate transport path because we don't have a location");
            return;
        }
        this._pathIds = (0, roadPathFinder_1.roadPathFinder)(this._locationId, this._destinationId);
        if (this._pathIds.length === 0) {
            debugger;
            console.log("Resource cannot calculate transport path, retrying...", this._locationId, this._destinationId);
            // We failed to find a path, queue a re-check
            new IgeTimeout_1.IgeTimeout(() => {
                this.calculateTransportPath();
            }, 1000);
            return;
        }
        //console.log("Resource path is", this._pathIds.toString());
        // Add resource to the current location's transport queue
        this._location.outboundQueue.addItem(this);
    }
    destroy() {
        delete this._location;
        delete this._destination;
        return super.destroy();
    }
}
exports.Resource = Resource;
(0, igeClassStore_1.registerClass)(Resource);
