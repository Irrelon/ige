import { ige } from "@/engine/instance";
import { Line } from "./base/Line";
import { registerClass } from "@/engine/igeClassStore";
import { IgeTimeout } from "@/engine/core/IgeTimeout";
export class Road extends Line {
    classId = "Road";
    _fromId;
    _from;
    _toId;
    _to;
    constructor(fromId, toId) {
        super();
        this.layer(0);
        //this.data("glowSize", 30);
        //this.data("glowIntensity", 1);
        this._fromId = fromId;
        this._toId = toId;
        this.isometric(ige.data("isometric"));
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
        if (this.isometric()) {
            const fromLocation = this._from._translate;
            const toLocation = this._to._translate;
            this.setLine(fromLocation.x, fromLocation.y, toLocation.x, toLocation.y);
        }
        else {
            const fromLocation = this._from._translate;
            const toLocation = this._to._translate;
            this.setLine(fromLocation.x, fromLocation.y, toLocation.x, toLocation.y);
        }
    }
    streamCreateConstructorArgs() {
        return [this._fromId, this._toId];
    }
}
registerClass(Road);
