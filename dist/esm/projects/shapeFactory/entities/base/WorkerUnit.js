import { ige } from "../../../../engine/instance.js"
import { Circle } from "./Circle.js"
import { registerClass } from "../../../../engine/igeClassStore.js"
export class WorkerUnit extends Circle {
    _type;
    constructor(type) {
        super();
        this._type = type;
        this.isometric(ige.data("isometric"));
        this.layer(0)
            .width(20)
            .height(20);
    }
}
registerClass(WorkerUnit);
