import { ige } from "@/engine/instance";
import { Circle } from "./base/Circle";
import { ResourceType } from "../enums/ResourceType";
import { Building } from "./base/Building";
import { registerClass } from "@/engine/igeClassStore";
import { IgeTimeout } from "@/engine/core/IgeTimeout";
import { Road } from "./Road";

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

		this.setNavigation();
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
	}

	onDropped (droppedLocationId: string) {
		this._location = ige.$(droppedLocationId) as Building;

		// Calculate next hop in path to destination
		const roads = ige.$$("road") as Road[];

		// Find the roads that connect to the destination
		const filteredRoads = roads.filter((road) => {
			return road._toId === this._destinationId || road._fromId === this._destinationId;
		});

		const path = [this._destinationId];

		// Loop the roads and traverse them
		filteredRoads.forEach((road) => {

		});
	}

	streamCreateConstructorArgs () {
		return [this._type, this._locationId, this._destinationId];
	}
}

registerClass(Resource);
