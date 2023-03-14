import { ige } from "../../engine/instance";
import IgeEntity from "../../engine/core/IgeEntity";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";
import { Building } from "./base/Building";
import { WorkerUnitType } from "../enums/WorkerUnitType";
import { WorkerUnit } from "./WorkerUnit";
import { registerClass } from "../../engine/services/igeClassStore";

export class Transporter extends WorkerUnit {
	classId = "Transporter";
	_depotAId: string;
	_depotA: IgeEntity;
	_depotBId: string;
	_depotB: IgeEntity;

	constructor (depotAId: string, depotBId: string) {
		super(WorkerUnitType.transporter);

		this._depotAId = depotAId;
		this._depotBId = depotBId;

		this._depotA = ige.$(depotAId) as Building;
		this._depotB = ige.$(depotBId) as Building;

		this.depth(2)
			.scaleTo(0.3, 0.3, 0.3);
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		super.update(ctx, tickDelta);
	}

	streamCreateData () {
		return [this._depotAId, this._depotBId];
	}
}

registerClass(Transporter);