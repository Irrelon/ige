import { registerClass } from "../../engine/services/igeClassStore.js";
import { Circle } from "./base/Circle.js";
export class FactoryBuilding extends Circle {
    constructor(produces, requires = []) {
        super();
        this.transportQueue = [];
        this._produces = produces;
        this._requires = requires;
    }
    streamCreateData() {
        return [this._produces, this._requires];
    }
}
registerClass(FactoryBuilding);
