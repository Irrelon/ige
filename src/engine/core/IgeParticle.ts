import { IgeEntity } from "./IgeEntity";
import { IgeVelocityComponent } from "../components/IgeVelocityComponent";
import {arrPull} from "../utils";
import type { IgeParticleEmitter } from "./IgeParticleEmitter";

export class IgeParticle extends IgeEntity {
	classId = "IgeParticle";
	_emitter: IgeParticleEmitter;

	constructor (emitter: IgeParticleEmitter) {
		super();

		this.noAabb(true);

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