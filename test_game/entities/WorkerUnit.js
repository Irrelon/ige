import { Circle } from "./base/Circle";
import { registerClass } from "../../engine/services/igeClassStore";
export class WorkerUnit extends Circle {
    constructor(type) {
        super();
        this._type = type;
        this.depth(2)
            .scaleTo(0.3, 0.3, 0.3);
    }
}
registerClass(WorkerUnit);
