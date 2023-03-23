import { ige } from "../../engine/instance.js";
import { Circle } from "./base/Circle.js";
import { registerClass } from "../../engine/igeClassStore.js";
import { IgeTimeout } from "../../engine/core/IgeTimeout.js";
import { isServer } from "../../engine/clientServer.js";
import { roadPathFinder } from "../services/roadPathFinder.js";
export class Resource extends Circle {
    constructor(type, locationId, destinationId) {
        super();
        this._pathIds = [];
        this.depth(4);
        this.data("fillColor", "#006901")
            .width(10)
            .height(10);
        this._type = type;
        this._locationId = locationId;
        this._destinationId = destinationId;
        if (isServer) {
            this.setNavigation();
        }
    }
    setNavigation() {
        this._location = ige.$(this._locationId);
        this._destination = ige.$(this._destinationId);
        if (!this._location || !this._destination) {
            // Create a timeout to re-check
            new IgeTimeout(() => {
                this.setNavigation();
            }, 50);
            return;
        }
        this.onDropped(this._locationId);
    }
    onDropped(droppedLocationId) {
        this._location = ige.$(droppedLocationId);
        this._locationId = droppedLocationId;
        if (!this._location) {
            // Couldn't get current location, re-queue the check
            new IgeTimeout(() => {
                this.onDropped(droppedLocationId);
            }, 1000);
            return;
        }
        //console.log("Resource is located at", this._locationId);
        //console.log("Resource wants to get to", this._destinationId);
        if (this._locationId === this._destinationId) {
            //console.log("We got to our destination!");
            this._pathIds = [];
            this.destroy();
            return;
        }
        this.calculateTransportPath();
    }
    calculateTransportPath() {
        if (!this._location) {
            console.log("Resource cannot calculate transport path because we don't have a location");
            return;
        }
        this._pathIds = roadPathFinder(this._locationId, this._destinationId);
        if (this._pathIds.length === 0) {
            console.log("Resource cannot calculate transport path, retrying...");
            // We failed to find a path, queue a re-check
            new IgeTimeout(() => {
                this.calculateTransportPath();
            }, 1000);
            return;
        }
        //console.log("Resource path is", this._pathIds.toString());
        // Add resource to the current location's transport queue
        this._location.transportQueue.push(this);
    }
    streamCreateConstructorArgs() {
        return [this._type, this._locationId, this._destinationId];
    }
}
registerClass(Resource);
