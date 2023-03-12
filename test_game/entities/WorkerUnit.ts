import { Circle } from "./base/Circle";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";
import { WorkerUnitType } from "../enums/WorkerUnitType";
import { registerClass } from "../../engine/services/igeClassStore";

export class WorkerUnit extends Circle {
	_type: WorkerUnitType;

	constructor (type: WorkerUnitType) {
		super();

		this._type = type;

		this.depth(2)
			.scaleTo(0.3, 0.3, 0.3);
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		super.update(ctx, tickDelta);


	}
}

registerClass(WorkerUnit);