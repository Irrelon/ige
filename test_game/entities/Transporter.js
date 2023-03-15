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
        this.depth(3)
            .scaleTo(0.3, 0.3, 0.3);
    }
    update(ctx, tickDelta) {
        if (!this._depotA)
            return;
        if (!this._depotB)
            return;
        // Determine if we should be transporting anything
        if (this._depotA.transportQueue.length) {
            // Go pick up the item
        }
        super.update(ctx, tickDelta);
    }
    streamCreateConstructorArgs() {
        return [this._depotAId, this._depotBId];
    }
}
registerClass(Transporter);
