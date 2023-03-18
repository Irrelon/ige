import { IgeEntity } from "./IgeEntity.js";
import { IgeVelocityComponent } from "../components/IgeVelocityComponent.js";
import { arrPull } from "../services/utils.js";
export class IgeParticle extends IgeEntity {
    constructor(emitter) {
        super();
        this.classId = "IgeParticle";
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
