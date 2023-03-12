import { Line } from "./base/Line.js";
import { ige } from "../../engine/instance.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
export class Road extends Line {
    constructor(fromId, toId) {
        super();
        this._fromId = fromId;
        this._toId = toId;
        this._from = ige.$(fromId);
        this._to = ige.$(toId);
        if (this._from && this._to) {
            this.setLine(this._from._translate.x, this._from._translate.y, this._to._translate.x, this._to._translate.y);
        }
    }
    streamCreateData() {
        return [this._fromId, this._toId];
    }
}
registerClass(Road);
