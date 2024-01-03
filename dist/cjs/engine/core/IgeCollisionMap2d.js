"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeCollisionMap2d = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
// TODO: Does this NEED to be an IgeEntity or can it be an IgeObject?
class IgeCollisionMap2d extends exports_1.IgeEntity {
    constructor() {
        super();
        this.classId = "IgeCollisionMap2d";
        this.map = new exports_2.IgeMap2d();
    }
    mapData(val) {
        if (val !== undefined) {
            this.map.mapData(val);
            return this;
        }
        return this.map.mapData();
    }
}
exports.IgeCollisionMap2d = IgeCollisionMap2d;
