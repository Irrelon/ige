import { ige } from "@/engine/instance";
import { Circle } from "./base/Circle";
import { ResourceType } from "../enums/ResourceType";
import { Building } from "./base/Building";
import { registerClass } from "@/engine/igeClassStore";
import { IgeTimeout } from "@/engine/core/IgeTimeout";
import { ResourcePathFinder } from "../services/ResourcePathFinder";
import { isServer } from "@/engine/clientServer";

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

		// console.log("Resource is located at", this._locationId);
		// console.log("Resource wants to get to", this._destinationId);

		if (this._locationId === this._destinationId) {
			//console.log("We got to our destination!");
			this._pathIds = [];
			this.destroy();
			return;
		}

		const pathFinder = new ResourcePathFinder();
		const sourceNode = pathFinder.getNode(this._locationId);
		const targetNode = pathFinder.getNode(this._destinationId);

		if (!sourceNode || !targetNode) {
			console.log("Resource no source or dest!");
			return;
		}

		const path = pathFinder.generate(sourceNode, targetNode).map((pathItem) => {
			return pathItem._id;
		});

		this._pathIds = path;

		//console.log("Resource path is", this._pathIds.toString());

		// Add resource to the current location's transport queue
		this._location.transportQueue.push(this);
	}

	streamCreateConstructorArgs () {
		return [this._type, this._locationId, this._destinationId];
	}
}

registerClass(Resource);
