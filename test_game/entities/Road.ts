import { ige } from "../../engine/instance";
import { Line } from "./base/Line";
import { Building } from "./base/Building";
import { registerClass } from "../../engine/services/igeClassStore";

export class Road extends Line {
	classId = "Road";
	_fromId: string;
	_from?: Building;
	_toId: string;
	_to?: Building;

	constructor (fromId: string, toId: string) {
		super();

		this._fromId = fromId;
		this._toId = toId;

		this._from = ige.$(fromId) as Building;
		this._to = ige.$(toId) as Building;

		if (this._from && this._to) {
			this.setLine(this._from._translate.x, this._from._translate.y, this._to._translate.x, this._to._translate.y);
		}
	}

	streamCreateConstructorArgs () {
		return [this._fromId, this._toId];
	}
}

registerClass(Road);
