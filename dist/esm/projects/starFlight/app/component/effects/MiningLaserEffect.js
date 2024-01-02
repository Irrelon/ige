import { LaserEffect } from "./LaserEffect.js";
import { IgeAudioEntity } from "../../../../../engine/audio/index.js";
import { isClient } from "../../../../../engine/clientServer.js";
import { IgeParticleEmitter } from "../../../../../engine/core/IgeParticleEmitter.js";
import { IgePoint3d } from "../../../../../engine/core/IgePoint3d.js";
import { registerClass } from "../../../../../engine/igeClassStore.js";
import { ige } from "../../../../../engine/instance.js";
import { MiningParticle } from "../particles/MiningParticle.js";

export class MiningLaserEffect extends LaserEffect {
	classId = "MiningLaserEffect";
	audio;
	particleEmitter;
	constructor(data = {}) {
		super(data);
		if (isClient) {
			this.audio = new IgeAudioEntity("miningLaser").relativeTo(ige.app.playerEntity).mount(this);
			this.texture(ige.textures.get("laser1"));
			this.particleEmitter = new IgeParticleEmitter()
				// Set the particle entity to generate for each particle
				.particle(MiningParticle)
				// Set particle life to 300ms
				.lifeBase(600)
				// Set output to 60 particles a second (1000ms)
				.quantityBase(60)
				.quantityTimespan(1000)
				.scaleBaseX(1)
				.scaleBaseY(1)
				// Set the particle's death opacity to zero so it fades out as it's lifespan runs out
				.deathOpacityBase(0)
				// Set velocity vector to y = 0.02, with variance values
				.velocityVector(new IgePoint3d(0, 0, 0), new IgePoint3d(-0.05, -0.05, 0), new IgePoint3d(0.05, 0.05, 0))
				// Mount new particles to the object scene
				.particleMountTarget(ige.$("frontScene"))
				.layer(4)
				// Mount the emitter to the ship
				.mount(this);
		}
		this.layer(3);
	}
	update(ctx, tickDelta) {
		super.update(ctx, tickDelta);
		if (isClient) {
			if (this._fromEntity && this._toEntity && this._alive) {
				this.particleEmitter?.translateTo(
					this._toEntity._translate.x + this._scanX,
					this._toEntity._translate.y + this._scanY,
					0
				);
				this.audio?.translateTo(
					this._toEntity._translate.x + this._scanX,
					this._toEntity._translate.y + this._scanY,
					0
				);
				if (!this.particleEmitter?._started) {
					this.particleEmitter?.start();
				}
				if (!this.audio?.playing()) {
					this.audio?.play(true);
				}
			} else {
				if (this.particleEmitter?._started) {
					this.particleEmitter?.stop();
				}
				if (this.audio?.playing()) {
					this.audio?.stop();
				}
			}
		}
	}
	destroy() {
		if (isClient) {
			this.audio?.stop();
		}
		return super.destroy();
	}
}
registerClass(MiningLaserEffect);
