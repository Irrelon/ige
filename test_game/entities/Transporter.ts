import { ige } from "@/engine/instance";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { WorkerUnitType } from "../enums/WorkerUnitType";
import { WorkerUnit } from "./base/WorkerUnit";
import { registerClass } from "@/engine/igeClassStore";
import { IgeTween } from "@/engine/core/IgeTween";
import type { Building } from "./base/Building";
import type { Resource } from "./Resource";
import { IgeTimeout } from "@/engine/core/IgeTimeout";
import { isServer } from "@/engine/clientServer";

export class Transporter extends WorkerUnit {
	classId = "Transporter";
	_depotAId: string;
	_depotA?: Building;
	_depotBId: string;
	_depotB?: Building;
	_resource?: Resource;
	_state: "idle" | "retrieving" | "transporting" | "returning" = "idle";

	constructor (depotAId: string, depotBId: string) {
		super(WorkerUnitType.transporter);

		this._depotAId = depotAId;
		this._depotBId = depotBId;

		this.setDepots();
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
	}

	retrieveResource (resource?: Resource) {
		if (!resource) return;

		if (!resource._pathIds.length) {
			// Ignore this resource, it has no path!
			// But we probably shouldn't get here!
			return;
		}

		// Go pick up the item
		this._state = "retrieving";

		// Move the transporter towards the target resource
		new IgeTween(this._translate, {
			x: resource._translate.x,
			y: resource._translate.y
		}, 3000).afterTween( () => {
			this.pickUpResource(resource);
		}).start();
	}

	pickUpResource (resource?: Resource) {
		if (!resource || !resource._destination) return;

		this._resource = resource;
		this._state = "transporting";

		const nextPathStepId = resource._pathIds[0];
		const nextPathStep = ige.$(nextPathStepId) as Building;

		//console.log("Transporting...");

		// Move the transporter towards the target transport destination
		new IgeTween(this._translate, {
			x: nextPathStep._translate.x,
			y: nextPathStep._translate.y
		}, 3000).afterTween( () => {
			this.dropResource(resource);
		}).start();
	}

	dropResource (resource?: Resource) {
		if (!resource || !resource._destination) return;

		//console.log(`Dropping resource at ${resource._pathIds[0]}`);

		this._resource = undefined;
		resource.translateTo(this._translate.x, this._translate.y, 0);
		resource.onDropped(resource._pathIds[0]);

		this._state = "idle";

		//console.log(`Returning...`);

		// Move the transporter back to center of road
		// new IgeTween(this._translate, {
		// 	x: resource._destination._translate.x,
		// 	y: resource._destination._translate.y
		// }, 6000).afterTween( () => {
		// 	this.dropResource(resource);
		// }).start();
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		const depotA = this._depotA;
		const depotB = this._depotB;

		if (isServer) {
			if (depotA && depotB) {
				if (this._state === "idle") {
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

				if (this._state === "idle") {
					// Determine if we should be transporting anything
					for (let i = 0; i < depotB.transportQueue.length; i++) {
						const resource = depotB?.transportQueue[i];

						if (resource._pathIds[0] === this._depotAId) {
							depotB.transportQueue.splice(i, 1);
							//this.log(`Picking up resource ${resource._id} from depot B: ${depotB._id}`);
							//console.log("Depot A queue now:", depotB.transportQueue);

							this.retrieveResource(resource);
							break;
						}
					}
				}
			}

			if (this._resource) {
				this._resource.translateTo(this._translate.x, this._translate.y, 0);
			}
		}

		super.update(ctx, tickDelta);
	}

	streamCreateConstructorArgs () {
		return [this._depotAId, this._depotBId];
	}
}

registerClass(Transporter);
