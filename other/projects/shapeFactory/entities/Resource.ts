import type { Building } from "./base/Building";
import { GameEntity } from "./base/GameEntity";
import { isClient, isServer } from "@/engine/clientServer";
import { IgeTimeout } from "@/engine/core/IgeTimeout";
import { ige } from "@/engine/exports";
import { registerClass } from "@/engine/igeClassStore";
import { distance } from "@/engine/utils";
import { fillColorByResourceType } from "../services/resource";
import { roadPathFinder } from "../services/roadPathFinder";
import { ResourceType } from "../enums/ResourceType";

export class Resource extends GameEntity {
	_type: ResourceType;
	_locationId: string;
	_destinationId: string = "";
	_location?: Building;
	_destination?: Building;
	_pathIds: string[] = [];

	constructor (type: ResourceType, locationId: string) {
		super();

		this.layer(3);
		this.data("fillColor", fillColorByResourceType[type]).width(16).height(16);

		this.category("resource");
		this.isometric(ige.data("isometric"));
		//this.bounds3d(10, 10, 2);

		this._type = type;
		this._locationId = locationId;

		if (isClient) {
			if (type === ResourceType.elerium) {
				this.texture(ige.textures.get("elerium"));
			}

			if (type === ResourceType.uranium) {
				this.texture(ige.textures.get("uranium"));
			}

			if (type === ResourceType.wood) {
				this.texture(ige.textures.get("wood"));
			}

			if (type === ResourceType.stone) {
				this.texture(ige.textures.get("stone"));
			}

			if (type === ResourceType.science) {
				this.texture(ige.textures.get("science"));
			}

			if (type === ResourceType.energy) {
				this.texture(ige.textures.get("energy"));
			}

			if (type === ResourceType.gold) {
				this.texture(ige.textures.get("gold"));
			}

			if (type === ResourceType.brick) {
				this.texture(ige.textures.get("brick"));
			}
		}

		if (isServer) {
			this.selectDestination();
			this.setNavigation();
		}
	}

	streamCreateConstructorArgs () {
		return [this._type, this._locationId];
	}

	selectDestination () {
		this._destinationId = "base1"; // The destination when no other building needs the resource at the moment

		// Check buildings to see if any need this resource at the moment
		const buildings = ige.$$("building") as Building[];

		// If we have no buildings to scan, return, since destination will be the base
		if (!buildings.length) return;

		// Scan each building and ask if it needs this resource and if so, determine the closest one
		const needyList = buildings.filter((tmpBuilding) => tmpBuilding.needsResource(this._type));

		// If we have no buildings to send the resource to, return, since destination will be the base
		if (!needyList.length) return;
		//console.log(`Current ${ResourceType[this._type]} count`, needyList[0].id(), needyList[0].countAllResourcesByType(this._type));

		const distances: Record<string, number> = {};

		needyList.forEach((tmpBuilding) => {
			distances[tmpBuilding.id()] = distance(
				this._translate.x,
				this._translate.y,
				tmpBuilding._translate.x,
				tmpBuilding._translate.y
			);
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

	setNavigation () {
		if (this._destinationId) {
			this._location = ige.$(this._locationId) as Building;
			this._destination = ige.$(this._destinationId) as Building;
		}

		if (!this._location || !this._destination) {
			// Create a timeout to re-check
			new IgeTimeout(() => {
				this.setNavigation();
			}, 200);

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

			// Tell the destination building we have arrived
			this._destination?.onResourceArrived(this._type);

			// Destroy the resource
			this.destroy();
			return;
		}

		this.calculateTransportPath();
	}

	calculateTransportPath () {
		if (!this._location) {
			debugger;
			console.log("Resource cannot calculate transport path because we don't have a location");
			return;
		}

		this._pathIds = roadPathFinder(this._locationId, this._destinationId);

		if (this._pathIds.length === 0) {
			debugger;
			console.log("Resource cannot calculate transport path, retrying...", this._locationId, this._destinationId);
			// We failed to find a path, queue a re-check
			new IgeTimeout(() => {
				this.calculateTransportPath();
			}, 1000);
			return;
		}

		//console.log("Resource path is", this._pathIds.toString());

		// Add resource to the current location's transport queue
		this._location.outboundQueue.addItem(this);
	}

	destroy (): this {
		delete this._location;
		delete this._destination;

		return super.destroy();
	}
}

registerClass(Resource);
