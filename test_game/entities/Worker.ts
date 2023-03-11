import { Circle } from "./Circle";
import IgeEntity from "../../engine/core/IgeEntity";

export class Worker extends Circle {
	_depotA: IgeEntity;
	_depotB: IgeEntity;

	constructor (depotA: IgeEntity, depotB: IgeEntity) {
		super();

		this._depotA = depotA;
		this._depotB = depotB;

		this.depth(2)
			.scaleTo(0.3, 0.3, 0.3);
	}
}