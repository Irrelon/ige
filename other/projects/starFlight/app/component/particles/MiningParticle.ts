import { IgeParticle } from "@/engine/core/IgeParticle";
import type { IgeParticleEmitter } from "@/engine/core/IgeParticleEmitter";
import { ige } from "@/engine/exports";
import { arrPull } from "@/engine/utils";

export class MiningParticle extends IgeParticle {
	classId = "MiningParticle";

	constructor (emitter: IgeParticleEmitter) {
		super(emitter);

		// Setup the particle default values
		this.texture(ige.textures.get("explosions1")).cell(39).width(15).height(15).layer(1).category("MiningParticle");

		/*self.addComponent(IgeTextureAnimationComponent);
		 self.animation
		 .define('smoke', self.animation.generateFrameArray(32, 71), 25, -1)
		 .cell(1);*/

		//self.animation.start('smoke');
	}

	destroy () {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			arrPull(this._emitter._particles, this);
		}
		//this.animation.stop();
		return super.destroy();
	}
}
