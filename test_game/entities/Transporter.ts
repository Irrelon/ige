import { ige } from "@/engine/instance";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { WorkerUnitType } from "../enums/WorkerUnitType";
import { WorkerUnit } from "./base/WorkerUnit";
import { registerClass } from "@/engine/igeClassStore";
import { IgeTween } from "@/engine/core/IgeTween";
import type { Building } from "./base/Building";
import type { Resource } from "./Resource";
import type { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeTimeout } from "@/engine/core/IgeTimeout";

export class Transporter extends WorkerUnit {
	classId = "Transporter";
	_depotAId: string;
	_depotA?: Building;
	_depotBId: string;
	_depotB?: Building;
	_targetResource?: Resource;
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

		// Go pick up the item
		this._targetResource = resource;
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

		resource.mount(this);
		resource.translateTo(0, 0, 0);

		this._state = "transporting";

		// Move the transporter towards the target transport destination
		new IgeTween(this._translate, {
			x: resource._destination._translate.x,
			y: resource._destination._translate.y
		}, 3000).afterTween( () => {
			this.dropResource(resource);
		}).start();
	}

	dropResource (resource?: Resource) {
		if (!resource || !resource._destination) return;

		resource.mount(ige.$("scene1") as IgeScene2d);
		resource.translateTo(this._translate.x, this._translate.y, 0);
		resource.onDropped(resource._destination.id());

		this._state = "returning";

		// Move the transporter back to center of road
		// new IgeTween(this._translate, {
		// 	x: resource._destination._translate.x,
		// 	y: resource._destination._translate.y
		// }, 6000).afterTween( () => {
		// 	this.dropResource(resource);
		// }).start();
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		if (!this._depotA) return;
		if (!this._depotB) return;

		if (this._state === "idle") {
			// Determine if we should be transporting anything
			if (this._depotA.transportQueue.length) {
				this.retrieveResource(this._depotA.transportQueue.shift());
			}
		}

		super.update(ctx, tickDelta);
	}

	streamCreateConstructorArgs () {
		return [this._depotAId, this._depotBId];
	}
}

registerClass(Transporter);
