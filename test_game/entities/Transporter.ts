import IgeEntity from "../../engine/core/IgeEntity";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";
import { Building } from "./base/Building";
import { WorkerUnitType } from "../enums/WorkerUnitType";
import { WorkerUnit } from "./WorkerUnit";
import { registerClass } from "../../engine/services/igeClassStore";

export class Transporter extends WorkerUnit {
	_depotA: IgeEntity;
	_depotB: IgeEntity;

	constructor (depotA: Building, depotB: Building) {
		super(WorkerUnitType.transporter);

		this._depotA = depotA;
		this._depotB = depotB;

		this.depth(2)
			.scaleTo(0.3, 0.3, 0.3);
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		super.update(ctx, tickDelta);


	}
}

registerClass(Transporter);