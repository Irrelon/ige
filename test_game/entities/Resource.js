import { Circle } from "./base/Circle.js";
import { ige } from "../../engine/instance.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
export class Resource extends Circle {
    constructor(type, destinationId) {
        super();
        const destination = ige.$(destinationId);
        this._type = type;
        this._destinationId = destinationId;
        this._destination = destination;
    }
    streamCreateData() {
        return [this._type, this._destinationId];
    }
}
registerClass(Resource);
