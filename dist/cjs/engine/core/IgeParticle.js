"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeParticle = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const exports_3 = require("../../export/exports.js");
class IgeParticle extends exports_1.IgeEntity {
    constructor(emitter) {
        super();
        this.classId = "IgeParticle";
        this.noAabb(true);
        // Setup the particle default values
        this._emitter = emitter;
        this.addComponent("velocity", exports_2.IgeVelocityComponent);
    }
    destroy() {
        // Remove ourselves from the emitter
        if (this._emitter !== undefined) {
            (0, exports_3.arrPull)(this._emitter._particles, this);
        }
        return super.destroy();
    }
}
exports.IgeParticle = IgeParticle;
