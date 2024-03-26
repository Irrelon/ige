import { IgeVelocityComponent } from "@/engine/components/IgeVelocityComponent";
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeParticleEmitter } from "@/engine/core/IgeParticleEmitter";
import { arrPull } from "@/engine/utils/arrays";

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
