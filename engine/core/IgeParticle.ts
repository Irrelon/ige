import IgeEntity from "./IgeEntity";
import IgeVelocityComponent from "../components/IgeVelocityComponent";
import {arrPull} from "../services/utils";
import type IgeParticleEmitter from "./IgeParticleEmitter";

class IgeParticle extends IgeEntity {
	classId = "IgeParticle";
	_emitter: IgeParticleEmitter;

	constructor (emitter: IgeParticleEmitter) {
		super();

		// Setup the particle default values
		this._emitter = emitter;
		this.addComponent("velocity", IgeVelocityComponent);
	}

	destroy () {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			arrPull(this._emitter._particles, this);
		}

		return super.destroy();
	}
}

export default IgeParticle;
