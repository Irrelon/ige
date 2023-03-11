import { Circle } from "./Circle.js";
export class Worker extends Circle {
    constructor(depotA, depotB) {
        super();
        this._depotA = depotA;
        this._depotB = depotB;
        this.depth(2)
            .scaleTo(0.3, 0.3, 0.3);
    }
}
