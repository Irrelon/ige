import { Triangle } from "./base/Triangle.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
export class ResourceBuilding extends Triangle {
    constructor(produces, requires = []) {
        super();
        this.classId = "ResourceBuilding";
        this._produces = produces;
        this._requires = requires;
    }
    streamCreateConstructorArgs() {
        return [this._produces, this._requires];
    }
}
registerClass(ResourceBuilding);
