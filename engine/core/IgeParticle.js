import IgeEntity from "./IgeEntity.js";
import IgeVelocityComponent from "../components/IgeVelocityComponent.js";
import { arrPull } from "../services/utils.js";
class IgeParticle extends IgeEntity {
    constructor(ige, emitter) {
        super(ige);
        this.classId = "IgeParticle";
        // Setup the particle default values
        this._emitter = emitter;
        this.addComponent(IgeVelocityComponent);
    }
    destroy() {
        // Remove ourselves from the emitter
        if (this._emitter !== undefined) {
            arrPull(this._emitter._particles, this);
        }
        super.destroy();
    }
}
export default IgeParticle;
