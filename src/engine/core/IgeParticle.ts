import { IgeEntity } from "@/export/exports";
import type { IgeParticleEmitter } from "@/export/exports";
import { IgeVelocityComponent } from "@/export/exports";
import { arrPull } from "@/export/exports";

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
