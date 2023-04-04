import { ige } from "../../engine/instance.js";
import { Line } from "./base/Line.js";
import { registerClass } from "../../engine/igeClassStore.js";
import { IgeTimeout } from "../../engine/core/IgeTimeout.js";
export class Road extends Line {
    constructor(fromId, toId) {
        super();
        this.classId = "Road";
        this.layer(0);
        //this.data("glowSize", 30);
        //this.data("glowIntensity", 1);
        this._fromId = fromId;
        this._toId = toId;
        this.category("road");
        this.setLocation();
    }
    setLocation() {
        this._from = ige.$(this._fromId);
        this._to = ige.$(this._toId);
        if (!(this._from && this._to)) {
            // Create a timeout to re-check
            new IgeTimeout(() => {
                this.setLocation();
            }, 50);
            return;
        }
        this.setLine(this._from._translate.x, this._from._translate.y, this._to._translate.x, this._to._translate.y);
    }
    streamCreateConstructorArgs() {
        return [this._fromId, this._toId];
    }
}
registerClass(Road);
