import { registerClass } from "../../engine/services/igeClassStore.js";
import { Star } from "./base/Star.js";
export class FactoryBuilding extends Star {
    constructor(produces, requires = []) {
        super();
        this.classId = "FactoryBuilding";
        this.depth(1);
        this._produces = produces;
        this._requires = requires;
    }
    streamCreateConstructorArgs() {
        return [this._produces, this._requires];
    }
}
registerClass(FactoryBuilding);
