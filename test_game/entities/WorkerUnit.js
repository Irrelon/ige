import { Circle } from "./base/Circle.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
export class WorkerUnit extends Circle {
    constructor(type) {
        super();
        this._type = type;
        this.depth(2)
            .scaleTo(0.3, 0.3, 0.3);
    }
    update(ctx, tickDelta) {
        super.update(ctx, tickDelta);
    }
}
registerClass(WorkerUnit);
