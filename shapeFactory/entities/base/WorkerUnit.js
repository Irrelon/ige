import { Circle } from "./Circle.js";
import { registerClass } from "../../../engine/igeClassStore.js";
export class WorkerUnit extends Circle {
    constructor(type) {
        super();
        this._type = type;
        this.depth(0)
            .width(20)
            .height(20);
    }
}
registerClass(WorkerUnit);
