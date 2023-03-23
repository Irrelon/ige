import { Triangle } from "./base/Triangle.js";
import { registerClass } from "../../engine/igeClassStore.js";
export class FactoryBuilding extends Triangle {
    constructor(produces, requires = []) {
        super();
        this.classId = "FactoryBuilding";
        this._produces = produces;
        this._requires = requires;
    }
    streamCreateConstructorArgs() {
        return [this._produces, this._requires];
    }
}
registerClass(FactoryBuilding);
