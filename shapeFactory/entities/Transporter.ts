import { ige } from "@/engine/instance";
import { isServer } from "@/engine/clientServer";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { WorkerUnitType } from "../enums/WorkerUnitType";
import { WorkerUnit } from "./base/WorkerUnit";
import { registerClass } from "@/engine/igeClassStore";
import { IgeTween } from "@/engine/core/IgeTween";
import { IgeTimeout } from "@/engine/core/IgeTimeout";
import type { Building } from "./base/Building";
import type { Resource } from "./Resource";
import type { Road } from "./Road";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { roadPathFinder } from "../services/roadPathFinder";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { distance } from "@/engine/utils";

export class Transporter extends WorkerUnit {
	classId = "Transporter";
	_baseId: string;
	_depotAId: string;
	_depotA?: Building;
	_depotBId: string;
	_depotB?: Building;
	_resource?: Resource;
	_state: "spawned" | "traversingPath" | "waiting" | "retrieving" | "transporting" | "movingToHomeLocation" = "spawned";
	_homeLocation?: IgePoint3d;
	_navigateToHomePath?: string[];
	_speed: number = 0.1;

	constructor (baseId: string, depotAId: string, depotBId: string) {
		super(WorkerUnitType.transporter);

		this._baseId = baseId;
		this._depotAId = depotAId;
		this._depotBId = depotBId;

		this.setDepots();
	}

	timeToTarget (sourceX: number, sourceY: number, targetX: number, targetY: number): number {
		return distance(sourceX, sourceY, targetX, targetY) / this._speed;
	}

	streamCreateConstructorArgs () {
		return [this._baseId, this._depotAId, this._depotBId];
	}

	setDepots () {
		this._depotA = ige.$(this._depotAId) as Building;
		this._depotB = ige.$(this._depotBId) as Building;

		if (!this._depotA || !this._depotB) {
			// Create a timeout to re-check
			new IgeTimeout(() => {
				this.setDepots();
			}, 50);

			return;
		}

		this.setRoad();
	}

	setRoad () {
		if (!this._depotA || !this._depotB) {
			// Create a timeout to re-check
			new IgeTimeout(() => {
				this.setRoad();
			}, 150);

			return;
		}

		// We've got both depots, find the road that connects them
		const roads = ige.$$("road") as Road[];

		const depotConnectionRoad = roads.find((tmpRoad) => {
			return tmpRoad._fromId === this._depotAId && tmpRoad._toId === this._depotBId || tmpRoad._fromId === this._depotBId && tmpRoad._toId === this._depotAId;
		});

		if (!depotConnectionRoad) {
			// Create a timeout to re-check
			new IgeTimeout(() => {
				this.setRoad();
			}, 150);

			return;
		}

		// We found the connecting road, set the center of that road as the home
		// location for the worker to hang out and wait for resources to transport
		this._homeLocation = depotConnectionRoad._translate;
	}

	retrieveResource (resource?: Resource) {
		if (!resource) return;

		if (!resource._pathIds.length) {
			// Ignore this resource, it has no path!
			// But we probably shouldn't get here!
			debugger;
			return;
		}

		// Go pick up the item
		this._state = "retrieving";

		// Move the transporter towards the target resource
		new IgeTween(this._translate, {
			x: resource._translate.x,
			y: resource._translate.y
		}, this.timeToTarget(this._translate.x, this._translate.y, resource._translate.x, resource._translate.y)).afterTween( () => {
			this.pickUpResource(resource);
		}).start();
	}

	pickUpResource (resource?: Resource) {
		if (!resource || !resource._destination) return;

		this._resource = resource;
		this.transportResource();
	}

	transportResource () {
		if (!this._resource) {
			return;
		}

		this._state = "transporting";

		const nextPathStepId = this._resource._pathIds[0];
		const nextPathStep = ige.$(nextPathStepId) as Building;

		//console.log("Transporting...");

		// Move the transporter towards the target transport destination
		new IgeTween(this._translate, {
			x: nextPathStep._translate.x,
			y: nextPathStep._translate.y
		}, this.timeToTarget(this._translate.x, this._translate.y, nextPathStep._translate.x, nextPathStep._translate.y)).afterTween( () => {
			this.dropResource(this._resource);
		}).start();
	}

	dropResource (resource?: Resource) {
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
		const currentLocation = ige.$(droppedLocationId) as Building;
		if (!currentLocation) {
			this.moveToHomeLocation();
			return;
		}

		if (this._depotA && this._depotB) {
			if (currentLocation === this._depotA) {
				// Check for items that need to route to depot B
				for (let i = 0; i < this._depotA.transportQueue.length; i++) {
					const newResource = this._depotA?.transportQueue[i];

					if (newResource._pathIds[0] === this._depotBId) {
						this._depotB.transportQueue.splice(i, 1);
						this.retrieveResource(newResource);
						return;
					}
				}
			} else {
				// Check for items that need to route to depot A
				for (let i = 0; i < this._depotB.transportQueue.length; i++) {
					const newResource = this._depotB?.transportQueue[i];

					if (newResource._pathIds[0] === this._depotAId) {
						this._depotB.transportQueue.splice(i, 1);
						this.retrieveResource(newResource);
						return;
					}
				}
			}
		}

		this.moveToHomeLocation();
	}

	moveToHomeLocation () {
		this._state = "movingToHomeLocation";

		if (!this._homeLocation) {
			this.gotBackHome();
			return;
		}

		//console.log(`Moving to home location...`);

		// Move the transporter back to center of road
		new IgeTween(this._translate, {
			x: this._homeLocation.x,
			y: this._homeLocation.y
		}, this.timeToTarget(this._translate.x, this._translate.y, this._homeLocation.x, this._homeLocation.y)).afterTween( () => {
			this.gotBackHome();
		}).start();
	}

	gotBackHome () {
		this._state = "waiting";
	}

	processPath () {
		this._state = "traversingPath";

		if (!this._navigateToHomePath) return;
		if (!this._navigateToHomePath.length) {
			// No more path locations to nav to
			this.moveToHomeLocation();
			return;
		}

		const targetId = this._navigateToHomePath.shift();
		const targetEntity = ige.$(targetId) as IgeEntity;
		if (!targetEntity) return;

		// Move the transporter to the next target
		new IgeTween(this._translate, {
			x: targetEntity._translate.x,
			y: targetEntity._translate.y
		}, this.timeToTarget(this._translate.x, this._translate.y, targetEntity._translate.x, targetEntity._translate.y)).afterTween( () => {
			this.processPath();
		}).start();
	}

	_serverUpdate () {
		const depotA = this._depotA;
		const depotB = this._depotB;
		const homeLocation = this._homeLocation;

		if (depotA && depotB && homeLocation) {
			if (this._state === "spawned") {
				// We've spawned and have a home location so navigate to our home location
				// Find a path to our home location
				const path1 = roadPathFinder(this._baseId, this._depotAId);
				const path2 = roadPathFinder(this._baseId, this._depotBId);

				if (path1.length < path2.length) {
					this._navigateToHomePath = path1;
				} else {
					this._navigateToHomePath = path2;
				}

				this.processPath();
			}

			// If we're waiting, check depot A
			if (this._state === "waiting") {
				// Determine if we should be transporting anything
				for (let i = 0; i < depotA.transportQueue.length; i++) {
					const resource = depotA?.transportQueue[i];

					if (resource._pathIds[0] === this._depotBId) {
						depotA.transportQueue.splice(i, 1);
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
				for (let i = 0; i < depotB.transportQueue.length; i++) {
					const resource = depotB?.transportQueue[i];

					if (resource._pathIds[0] === this._depotAId) {
						depotB.transportQueue.splice(i, 1);
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

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		if (isServer) {
			this._serverUpdate();
		}

		super.update(ctx, tickDelta);
	}
}

registerClass(Transporter);
