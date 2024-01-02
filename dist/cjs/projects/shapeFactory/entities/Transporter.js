"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transporter = void 0;
const WorkerUnit_1 = require("./base/WorkerUnit");
const clientServer_1 = require("../../../engine/clientServer.js");
const IgeTimeout_1 = require("../../../engine/core/IgeTimeout.js");
const IgeTween_1 = require("../../../engine/core/IgeTween.js");
const igeClassStore_1 = require("../../../engine/igeClassStore.js");
const instance_1 = require("../../../engine/instance.js");
const utils_1 = require("../../../engine/utils.js");
const roadPathFinder_1 = require("../services/roadPathFinder");
const WorkerUnitType_1 = require("../enums/WorkerUnitType");
class Transporter extends WorkerUnit_1.WorkerUnit {
    constructor(baseId, depotAId, depotBId) {
        super(WorkerUnitType_1.WorkerUnitType.transporter);
        this.classId = "Transporter";
        this._state = "spawned";
        this._speed = 0.2;
        this._baseId = baseId;
        this._depotAId = depotAId;
        this._depotBId = depotBId;
        this.layer(2);
        this.category("transporter");
        //this.data("glowColor", "#ffffff");
        //this.data("glowSize", 50);
        //this.data("glowIntensity", 1);
        this.setDepots();
    }
    timeToTarget(sourceX, sourceY, targetX, targetY) {
        return (0, utils_1.distance)(sourceX, sourceY, targetX, targetY) / this._speed;
    }
    streamCreateConstructorArgs() {
        return [this._baseId, this._depotAId, this._depotBId];
    }
    setDepots() {
        this._depotA = instance_1.ige.$(this._depotAId);
        this._depotB = instance_1.ige.$(this._depotBId);
        if (!this._depotA || !this._depotB) {
            // Create a timeout to re-check
            new IgeTimeout_1.IgeTimeout(() => {
                this.setDepots();
            }, 50);
            return;
        }
        this.setRoad();
    }
    setRoad() {
        if (!this._depotA || !this._depotB) {
            // Create a timeout to re-check
            new IgeTimeout_1.IgeTimeout(() => {
                this.setRoad();
            }, 150);
            return;
        }
        // We've got both depots, find the road that connects them
        const roads = instance_1.ige.$$("road");
        const depotConnectionRoad = roads.find((tmpRoad) => {
            return ((tmpRoad._fromId === this._depotAId && tmpRoad._toId === this._depotBId) ||
                (tmpRoad._fromId === this._depotBId && tmpRoad._toId === this._depotAId));
        });
        if (!depotConnectionRoad) {
            // Create a timeout to re-check
            new IgeTimeout_1.IgeTimeout(() => {
                this.setRoad();
            }, 150);
            return;
        }
        // We found the connecting road, set the center of that road as the home
        // location for the worker to hang out and wait for resources to transport
        this._homeLocation = depotConnectionRoad._translate;
    }
    retrieveResource(resource) {
        if (!resource)
            return;
        if (!resource._pathIds.length) {
            // Ignore this resource, it has no path!
            // But we probably shouldn't get here!
            debugger;
            return;
        }
        // Go pick up the item
        this._state = "retrieving";
        const obj = { x: 1 };
        new IgeTween_1.IgeTween(obj, {
            x: 100
        }, 4000).start();
        // Move the transporter towards the target resource
        new IgeTween_1.IgeTween(this._translate, {
            x: resource._translate.x,
            y: resource._translate.y
        }, this.timeToTarget(this._translate.x, this._translate.y, resource._translate.x, resource._translate.y))
            .afterTween(() => {
            this.pickUpResource(resource);
        })
            .start();
    }
    pickUpResource(resource) {
        if (!resource || !resource._destination)
            return;
        this._resource = resource;
        this.transportResource();
    }
    transportResource() {
        if (!this._resource) {
            return;
        }
        this._state = "transporting";
        const nextPathStepId = this._resource._pathIds[0];
        const nextPathStep = instance_1.ige.$(nextPathStepId);
        //console.log("Transporting...");
        // Move the transporter towards the target transport destination
        new IgeTween_1.IgeTween(this._translate, {
            x: nextPathStep._translate.x,
            y: nextPathStep._translate.y
        }, this.timeToTarget(this._translate.x, this._translate.y, nextPathStep._translate.x, nextPathStep._translate.y))
            .afterTween(() => {
            this.dropResource(this._resource);
        })
            .start();
    }
    dropResource(resource) {
        var _a, _b;
        if (!resource || !resource._destination) {
            this.moveToHomeLocation();
            return;
        }
        const droppedLocationId = resource._pathIds[0];
        //console.log(`Dropping resource at ${resource._pathIds[0]}`);
        this._resource = undefined;
        resource.translateTo(this._translate.x, this._translate.y, 0);
        resource.onDropped(resource._pathIds[0]);
        // Check if the place we just dropped a resource has
        // anything in the transport for us to pick up
        const currentLocation = instance_1.ige.$(droppedLocationId);
        if (!currentLocation) {
            this.moveToHomeLocation();
            return;
        }
        if (this._depotA && this._depotB) {
            if (currentLocation === this._depotA) {
                // Check for items that need to route to depot B
                for (let i = 0; i < this._depotA.outboundQueue.length(); i++) {
                    const newResource = (_a = this._depotA) === null || _a === void 0 ? void 0 : _a.outboundQueue.getIndex(i);
                    if (newResource._pathIds[0] === this._depotBId) {
                        this._depotB.outboundQueue.removeItem(newResource);
                        this.retrieveResource(newResource);
                        return;
                    }
                }
            }
            else {
                // Check for items that need to route to depot A
                for (let i = 0; i < this._depotB.outboundQueue.length(); i++) {
                    const newResource = (_b = this._depotB) === null || _b === void 0 ? void 0 : _b.outboundQueue.getIndex(i);
                    if (newResource._pathIds[0] === this._depotAId) {
                        this._depotB.outboundQueue.removeItem(newResource);
                        this.retrieveResource(newResource);
                        return;
                    }
                }
            }
        }
        this.moveToHomeLocation();
    }
    moveToHomeLocation() {
        this._state = "movingToHomeLocation";
        if (!this._homeLocation) {
            this.gotBackHome();
            return;
        }
        //console.log(`Moving to home location...`);
        // Move the transporter back to center of road
        new IgeTween_1.IgeTween(this._translate, {
            x: this._homeLocation.x,
            y: this._homeLocation.y
        }, this.timeToTarget(this._translate.x, this._translate.y, this._homeLocation.x, this._homeLocation.y))
            .afterTween(() => {
            this.gotBackHome();
        })
            .start();
    }
    gotBackHome() {
        this._state = "waiting";
    }
    processPath() {
        this._state = "traversingPath";
        if (!this._navigateToHomePath)
            return;
        if (!this._navigateToHomePath.length) {
            // No more path locations to nav to
            this.moveToHomeLocation();
            return;
        }
        const targetId = this._navigateToHomePath.shift();
        const targetEntity = instance_1.ige.$(targetId);
        if (!targetEntity)
            return;
        // Move the transporter to the next target
        new IgeTween_1.IgeTween(this._translate, {
            x: targetEntity._translate.x,
            y: targetEntity._translate.y
        }, this.timeToTarget(this._translate.x, this._translate.y, targetEntity._translate.x, targetEntity._translate.y))
            .afterTween(() => {
            this.processPath();
        })
            .start();
    }
    _updateOnServer() {
        const depotA = this._depotA;
        const depotB = this._depotB;
        const homeLocation = this._homeLocation;
        if (depotA && depotB && homeLocation) {
            if (this._state === "spawned") {
                // We've spawned and have a home location so navigate to our home location
                // Find a path to our home location
                const path1 = (0, roadPathFinder_1.roadPathFinder)(this._baseId, this._depotAId);
                const path2 = (0, roadPathFinder_1.roadPathFinder)(this._baseId, this._depotBId);
                if (path1.length < path2.length) {
                    this._navigateToHomePath = path1;
                }
                else {
                    this._navigateToHomePath = path2;
                }
                this.processPath();
            }
            // If we're waiting, check depot A
            if (this._state === "waiting") {
                // Determine if we should be transporting anything
                for (let i = 0; i < depotA.outboundQueue.length(); i++) {
                    const resource = depotA === null || depotA === void 0 ? void 0 : depotA.outboundQueue.getIndex(i);
                    if (resource._pathIds[0] === this._depotBId) {
                        depotA.outboundQueue.removeItem(resource);
                        //this.log(`Picking up resource ${resource._id} from depot A: ${depotA._id}`);
                        //console.log("Depot A queue now:", depotA.transportQueue);
                        this.retrieveResource(resource);
                        break;
                    }
                }
            }
            // We're still waiting, check depot B
            if (this._state === "waiting") {
                // Determine if we should be transporting anything
                for (let i = 0; i < depotB.outboundQueue.length(); i++) {
                    const resource = depotB === null || depotB === void 0 ? void 0 : depotB.outboundQueue.getIndex(i);
                    if (resource._pathIds[0] === this._depotAId) {
                        depotB.outboundQueue.removeItem(resource);
                        //this.log(`Picking up resource ${resource._id} from depot A: ${depotB._id}`);
                        //console.log("Depot B queue now:", depotB.transportQueue);
                        this.retrieveResource(resource);
                        break;
                    }
                }
            }
        }
        if (this._resource) {
            // Make the resource we are carrying follow us at our current location
            this._resource.translateTo(this._translate.x, this._translate.y, 0);
        }
    }
    update(ctx, tickDelta) {
        if (clientServer_1.isServer) {
            this._updateOnServer();
        }
        super.update(ctx, tickDelta);
    }
}
exports.Transporter = Transporter;
(0, igeClassStore_1.registerClass)(Transporter);
