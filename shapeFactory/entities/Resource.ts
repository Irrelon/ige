import { ige } from "@/engine/instance";
import { Circle } from "./base/Circle";
import { ResourceType } from "../enums/ResourceType";
import { Building } from "./base/Building";
import { registerClass } from "@/engine/igeClassStore";
import { IgeTimeout } from "@/engine/core/IgeTimeout";
import { isServer } from "@/engine/clientServer";
import { roadPathFinder } from "../services/roadPathFinder";

const fillColorByType: Record<ResourceType, string> = {
	[ResourceType.wood]: "#006901",
	[ResourceType.grain]: "#ff00ea",
	[ResourceType.energy]: "#ff9900"
};

export class Resource extends Circle {
	_type: ResourceType;
	_locationId: string;
	_destinationId: string;
	_location?: Building;
	_destination?: Building;
	_pathIds: string[] = [];

	constructor (type: ResourceType, locationId: string, destinationId: string) {
		super();

		this.depth(4);
		this.data("fillColor", fillColorByType[type])
			.width(10)
			.height(10);

		this._type = type;
		this._locationId = locationId;
		this._destinationId = destinationId;

		if (isServer) {
			this.setNavigation();
		}
	}

	streamCreateConstructorArgs () {
		return [this._type, this._locationId, this._destinationId];
	}

	setNavigation () {
		this._location = ige.$(this._locationId) as Building;
		this._destination = ige.$(this._destinationId) as Building;

		if (!this._location || !this._destination) {
			// Create a timeout to re-check
			new IgeTimeout(() => {
				this.setNavigation();
			}, 50);

			return;
		}

		this.onDropped(this._locationId);
	}

	onDropped (droppedLocationId: string) {
		this._location = ige.$(droppedLocationId) as Building;
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

	calculateTransportPath () {
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
}

registerClass(Resource);
