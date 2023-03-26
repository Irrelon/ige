import { Circle } from "./Circle";
import { WorkerUnitType } from "../../enums/WorkerUnitType";
import { registerClass } from "@/engine/igeClassStore";

export class WorkerUnit extends Circle {
	_type: WorkerUnitType;

	constructor (type: WorkerUnitType) {
		super();

		this._type = type;

		this.depth(0)
			.width(20)
			.height(20);
	}
}

registerClass(WorkerUnit);
