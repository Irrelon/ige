import type { Building } from "./base/Building";
import { Line } from "./base/Line";
import { IgeTimeout } from "@/engine/core/IgeTimeout";
import { ige } from "@/engine/exports";
import { registerClass } from "@/engine/igeClassStore";

export class Road extends Line {
	classId = "Road";
	_fromId: string;
	_from?: Building;
	_toId: string;
	_to?: Building;

	constructor (fromId: string, toId: string) {
		super();

		this.layer(0);

		//this.data("glowSize", 30);
		//this.data("glowIntensity", 1);

		this._fromId = fromId;
		this._toId = toId;
		this.isometric(ige.data("isometric"));
		this.category("road");

		this.setLocation();
	}

	setLocation () {
		this._from = ige.$(this._fromId) as Building;
		this._to = ige.$(this._toId) as Building;

		if (!(this._from && this._to)) {
			// Create a timeout to re-check
			new IgeTimeout(() => {
				this.setLocation();
			}, 50);

			return;
		}

		if (this.isometric()) {
			const fromLocation = this._from._translate;
			const toLocation = this._to._translate;
			this.setLine(fromLocation.x, fromLocation.y, toLocation.x, toLocation.y);
		} else {
			const fromLocation = this._from._translate;
			const toLocation = this._to._translate;
			this.setLine(fromLocation.x, fromLocation.y, toLocation.x, toLocation.y);
		}
	}

	streamCreateConstructorArgs () {
		return [this._fromId, this._toId];
	}
}

registerClass(Road);
