import { ige } from "../../engine/instance.js";
import { WorkerUnitType } from "../enums/WorkerUnitType.js";
import { WorkerUnit } from "./WorkerUnit.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
export class Transporter extends WorkerUnit {
    constructor(depotAId, depotBId) {
        super(WorkerUnitType.transporter);
        this.classId = "Transporter";
        this._depotAId = depotAId;
        this._depotBId = depotBId;
        this._depotA = ige.$(depotAId);
        this._depotB = ige.$(depotBId);
        this.depth(2)
            .scaleTo(0.3, 0.3, 0.3);
    }
    update(ctx, tickDelta) {
        super.update(ctx, tickDelta);
    }
    streamCreateData() {
        return [this._depotAId, this._depotBId];
    }
}
registerClass(Transporter);
