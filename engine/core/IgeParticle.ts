import IgeEntity from "./IgeEntity";
import IgeVelocityComponent from "../components/IgeVelocityComponent";
import IgeBaseClass from "./IgeBaseClass";

class IgeParticle extends IgeEntity {
	classId = "IgeParticle";

	constructor (ige, emitter) {
		super(ige);

		// Setup the particle default values
		this._emitter = emitter;
		this.addComponent(IgeVelocityComponent);
	}

	destroy () {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			IgeBaseClass.pull(this._emitter._particles, this);
		}

		super.destroy();
	}
}

export default IgeParticle;