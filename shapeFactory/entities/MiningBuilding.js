import { registerClass } from "../../engine/igeClassStore.js";
import { Star } from "./base/Star.js";
export class MiningBuilding extends Star {
    constructor(produces, requires = []) {
        super();
        this.classId = "MiningBuilding";
        this._produces = produces;
        this._requires = requires;
        this.depth(10);
    }
    streamCreateConstructorArgs() {
        return [this._produces, this._requires];
    }
}
registerClass(MiningBuilding);
