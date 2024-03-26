import { Circle } from "./Circle";
import { ige } from "@/engine/exports";
import { registerClass } from "@/engine/igeClassStore";
import type { WorkerUnitType } from "../../enums/WorkerUnitType";

export class WorkerUnit extends Circle {
	_type: WorkerUnitType;

	constructor (type: WorkerUnitType) {
		super();

		this._type = type;
		this.isometric(ige.data("isometric"));

		this.layer(0).width(20).height(20);
	}
}

registerClass(WorkerUnit);
