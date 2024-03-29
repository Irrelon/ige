import { IgeParticle } from "@/engine/core/IgeParticle";
import type { IgeParticleEmitter } from "@/engine/core/IgeParticleEmitter";
import { ige } from "@/engine/exports";
import { arrPull } from "@/engine/utils";

export class ThrustParticle extends IgeParticle {
	classId = "ThrustParticle";

	constructor (emitter: IgeParticleEmitter) {
		super(emitter);

		// Setup the particle default values
		this.texture(ige.textures.get("explosions1"))
			.cell(9)
			.width(15)
			.height(15)
			.layer(2)
			.depth(2)
			.category("thrustParticle");
	}

	destroy () {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			arrPull(this._emitter._particles, this);
		}

		return super.destroy();
	}
}
