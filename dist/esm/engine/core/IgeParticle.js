import { IgeEntity } from "../../export/exports.js"
import { IgeVelocityComponent } from "../../export/exports.js"
import { arrPull } from "../../export/exports.js"
export class IgeParticle extends IgeEntity {
    classId = "IgeParticle";
    _emitter;
    constructor(emitter) {
        super();
        this.noAabb(true);
        // Setup the particle default values
        this._emitter = emitter;
        this.addComponent("velocity", IgeVelocityComponent);
    }
    destroy() {
        // Remove ourselves from the emitter
        if (this._emitter !== undefined) {
            arrPull(this._emitter._particles, this);
        }
        return super.destroy();
    }
}
