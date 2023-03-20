var appCore = require('../../../../ige');

require('./LaserEffect');
require('../particles/MiningParticle');

appCore.module('MiningLaserEffect', function ($ige, $textures, $game, LaserEffect, MiningParticle, IgeParticleEmitter, IgePoint3d, IgeAudioEntity) {
	var MiningLaserEffect = LaserEffect.extend({
		classId: 'MiningLaserEffect',
		
		init: function (data) {
			LaserEffect.prototype.init.call(this, data);
			
			var self = this;
			
			if (!$ige.isServer) {
				this.audio = new IgeAudioEntity('miningLaser')
					.relativeTo($game.playerEntity)
					.mount(this);
				
				this.texture($textures.get('laser1'));
			}
			
			if (!$ige.isServer) {
				self.particleEmitter = new IgeParticleEmitter()
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
					.particleMountTarget($ige.engine.$('frontScene'))
					.layer(4)
					// Mount the emitter to the ship
					.mount(self);
			}
			
			this.layer(3);
		},
		
		update: function (ctx) {
			LaserEffect.prototype.update.call(this, ctx);
			
			if (this._fromEntity && this._toEntity && this._alive) {
				if (!$ige.isServer) {
					this.particleEmitter.translateTo(this._toEntity._translate.x + this._scanX, this._toEntity._translate.y + this._scanY, 0);
					this.audio.translateTo(this._toEntity._translate.x + this._scanX, this._toEntity._translate.y + this._scanY, 0);
					
					if (!this.particleEmitter._started) {
						this.particleEmitter.start();
					}
					
					if (!this.audio.playing()) {
						this.audio.play(true);
					}
				}
			} else {
				if (!$ige.isServer) {
					if (this.particleEmitter._started) {
						this.particleEmitter.stop();
					}
					
					if (this.audio.playing()) {
						this.audio.stop();
					}
				}
			}
		},
		
		destroy: function () {
			if (!$ige.isServer) {
				this.audio.stop();
			}
			
			LaserEffect.prototype.destroy.call(this);
		}
	});
	
	return MiningLaserEffect;
});