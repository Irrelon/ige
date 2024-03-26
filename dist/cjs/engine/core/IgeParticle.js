"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeParticle = void 0;
const IgeVelocityComponent_1 = require("../components/IgeVelocityComponent.js");
const IgeEntity_1 = require("./IgeEntity.js");
const arrays_1 = require("../utils/arrays.js");
class IgeParticle extends IgeEntity_1.IgeEntity {
    constructor(emitter) {
        super();
        this.classId = "IgeParticle";
        this.noAabb(true);
        // Setup the particle default values
        this._emitter = emitter;
        this.addComponent("velocity", IgeVelocityComponent_1.IgeVelocityComponent);
    }
    destroy() {
        // Remove ourselves from the emitter
        if (this._emitter !== undefined) {
            (0, arrays_1.arrPull)(this._emitter._particles, this);
        }
        return super.destroy();
    }
}
exports.IgeParticle = IgeParticle;
