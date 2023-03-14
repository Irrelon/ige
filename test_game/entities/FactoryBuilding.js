import { registerClass } from "../../engine/services/igeClassStore.js";
import { Star } from "./base/Star.js";
export class FactoryBuilding extends Star {
    constructor(produces, requires = []) {
        super();
        this.classId = "FactoryBuilding";
        this._produces = produces;
        this._requires = requires;
    }
    streamCreateData() {
        return [this._produces, this._requires];
    }
}
registerClass(FactoryBuilding);
