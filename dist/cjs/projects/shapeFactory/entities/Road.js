"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Road = void 0;
const instance_1 = require("@/engine/instance");
const Line_1 = require("./base/Line");
const igeClassStore_1 = require("@/engine/igeClassStore");
const IgeTimeout_1 = require("@/engine/core/IgeTimeout");
class Road extends Line_1.Line {
    constructor(fromId, toId) {
        super();
        this.classId = "Road";
        this.layer(0);
        //this.data("glowSize", 30);
        //this.data("glowIntensity", 1);
        this._fromId = fromId;
        this._toId = toId;
        this.isometric(instance_1.ige.data("isometric"));
        this.category("road");
        this.setLocation();
    }
    setLocation() {
        this._from = instance_1.ige.$(this._fromId);
        this._to = instance_1.ige.$(this._toId);
        if (!(this._from && this._to)) {
            // Create a timeout to re-check
            new IgeTimeout_1.IgeTimeout(() => {
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
exports.Road = Road;
(0, igeClassStore_1.registerClass)(Road);
