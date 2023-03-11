import { Circle } from "./Circle.js";
export class Worker extends Circle {
    constructor() {
        super();
        this.depth(2)
            .scaleTo(0.3, 0.3, 0.3);
    }
}
