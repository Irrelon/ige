import { ige } from "../../engine/instance";
import { Circle } from "./base/Circle";
import { registerClass } from "../../engine/services/igeClassStore";
export class Resource extends Circle {
    constructor(type, destinationId) {
        super();
        const destination = ige.$(destinationId);
        this._type = type;
        this._destinationId = destinationId;
        this._destination = destination;
    }
    streamCreateConstructorArgs() {
        return [this._type, this._destinationId];
    }
}
registerClass(Resource);
