import { IgeParticle } from "@/engine/core/IgeParticle";
import type { IgeParticleEmitter } from "@/engine/core/IgeParticleEmitter";
import { ige } from "@/engine/exports";

export class SmokeParticle extends IgeParticle {
	classId = "SmokeParticle";

	constructor (emitter: IgeParticleEmitter) {
		super(emitter);

		// Setup the particle default values
		this.texture(ige.textures.get("smoke")).cell(1).width(50).height(50).drawBounds(false).drawBoundsData(false);
	}
}
