import { Circle } from "./base/Circle.js";
import { registerClass } from "../../engine/igeClassStore.js";
export class WorkerUnit extends Circle {
    constructor(type) {
        super();
        this._type = type;
        this.depth(2)
            .scaleTo(0.3, 0.3, 0.3);
    }
}
registerClass(WorkerUnit);
