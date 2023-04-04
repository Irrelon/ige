import { ige } from "@/engine/instance";
import { Line } from "./base/Line";
import { Building } from "./base/Building";
import { registerClass } from "@/engine/igeClassStore";
import { IgeTimeout } from "@/engine/core/IgeTimeout";

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

		this.setLine(this._from._translate.x, this._from._translate.y, this._to._translate.x, this._to._translate.y);
	}

	streamCreateConstructorArgs () {
		return [this._fromId, this._toId];
	}
}

registerClass(Road);
