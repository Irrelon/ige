import { ige } from "../../engine/instance";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";
import { Building } from "./base/Building";
import { WorkerUnitType } from "../enums/WorkerUnitType";
import { WorkerUnit } from "./WorkerUnit";
import { registerClass } from "../../engine/services/igeClassStore";

export class Transporter extends WorkerUnit {
	classId = "Transporter";
	_depotAId: string;
	_depotA: Building;
	_depotBId: string;
	_depotB: Building;

	constructor (depotAId: string, depotBId: string) {
		super(WorkerUnitType.transporter);

		this._depotAId = depotAId;
		this._depotBId = depotBId;

		this._depotA = ige.$(depotAId) as Building;
		this._depotB = ige.$(depotBId) as Building;

		this.depth(3)
			.scaleTo(0.3, 0.3, 0.3);
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		if (!this._depotA) return;
		if (!this._depotB) return;

		// Determine if we should be transporting anything
		if (this._depotA.transportQueue.length) {
			// Go pick up the item
			
		}

		super.update(ctx, tickDelta);
	}

	streamCreateConstructorArgs () {
		return [this._depotAId, this._depotBId];
	}
}

registerClass(Transporter);
