"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerUnit = void 0;
const instance_1 = require("@/engine/instance");
const Circle_1 = require("./Circle");
const igeClassStore_1 = require("@/engine/igeClassStore");
class WorkerUnit extends Circle_1.Circle {
    constructor(type) {
        super();
        this._type = type;
        this.isometric(instance_1.ige.data("isometric"));
        this.layer(0)
            .width(20)
            .height(20);
    }
}
exports.WorkerUnit = WorkerUnit;
(0, igeClassStore_1.registerClass)(WorkerUnit);
