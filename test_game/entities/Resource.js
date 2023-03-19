import { ige } from "../../engine/instance.js";
import { Circle } from "./base/Circle.js";
import { registerClass } from "../../engine/igeClassStore.js";
import { IgeTimeout } from "../../engine/core/IgeTimeout.js";
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
        this.setNavigation();
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
    }
    onDropped(droppedLocationId) {
        this._location = ige.$(droppedLocationId);
        // Calculate next hop in path to destination
        const roads = ige.$$("road");
        // Find the roads that connect to the destination
        const filteredRoads = roads.filter((road) => {
            return road._toId === this._destinationId || road._fromId === this._destinationId;
        });
        const path = [this._destinationId];
        // Loop the roads and traverse them
        filteredRoads.forEach((road) => {
        });
    }
    streamCreateConstructorArgs() {
        return [this._type, this._locationId, this._destinationId];
    }
}
registerClass(Resource);
