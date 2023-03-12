import { WorkerUnitType } from "../enums/WorkerUnitType.js";
import { WorkerUnit } from "./WorkerUnit.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
export class Transporter extends WorkerUnit {
    constructor(depotA, depotB) {
        super(WorkerUnitType.transporter);
        this._depotA = depotA;
        this._depotB = depotB;
        this.depth(2)
            .scaleTo(0.3, 0.3, 0.3);
    }
    update(ctx, tickDelta) {
        super.update(ctx, tickDelta);
    }
}
registerClass(Transporter);
