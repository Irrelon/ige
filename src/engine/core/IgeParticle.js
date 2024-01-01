import { IgeEntity } from "./IgeEntity";
import { IgeVelocityComponent } from "../components/IgeVelocityComponent";
import { arrPull } from "../utils";
export class IgeParticle extends IgeEntity {
    constructor(emitter) {
        super();
        this.classId = "IgeParticle";
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
