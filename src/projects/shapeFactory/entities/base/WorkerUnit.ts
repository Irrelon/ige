import { Circle } from "./Circle";
import { registerClass } from "@/engine/igeClassStore";
import { ige } from "@/engine/instance";
import { WorkerUnitType } from "../../enums/WorkerUnitType";

export class WorkerUnit extends Circle {
	_type: WorkerUnitType;

	constructor(type: WorkerUnitType) {
		super();

		this._type = type;
		this.isometric(ige.data("isometric"));

		this.layer(0).width(20).height(20);
	}
}

registerClass(WorkerUnit);
