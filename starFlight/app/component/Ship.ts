var appCore = require('../../../ige');

require('./GameEntity');
require('./particles/ThrustParticle');

appCore.module('Ship', function ($ige, $game, $textures, GameEntity, IgePoly2d, IgePoint3d, IgeParticleEmitter, ThrustParticle) {
	var Ship = GameEntity.extend({
		classId: 'Ship',
		
		init: function (publicGameData) {
			GameEntity.prototype.init.call(this, publicGameData);
			
			var self = this;
			
			self.streamProperty('thrusting', false);
			self.category('ship');
			
			publicGameData = publicGameData || {};
			self._publicGameData = publicGameData;
			
			self.layer(2)
				.width(40)
				.height(40);
			
			if ($ige.engine.box2d) {
				// Define the polygon for collision
				self._definePhysics();
			}
			
			if ($ige.isClient) {
				self.texture($textures.get('ship1'));
				
				self.thrustEmitter = new IgeParticleEmitter()
				// Set the particle entity to generate for each particle
					.particle(ThrustParticle)
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
					.velocityVector(new IgePoint3d(0, 0.01, 0), new IgePoint3d(-0.08, 0.01, 0), new IgePoint3d(0.08, 0.05, 0))
					// Mount new particles to the object scene
					.particleMountTarget($ige.engine.$('frontScene'))
					// Move the particle emitter to the bottom of the ship
					.translateTo(0, 16, 0)
					// Mount the emitter to the ship
					.mount(self);
			}
		},
		
		/* CEXCLUDE */
		_definePhysics: function () {
			var self = this,
				fixDefs,
				collisionPoly = new IgePoly2d()
					.addPoint(0, -this._bounds2d.y2)
					.addPoint(this._bounds2d.x2, this._bounds2d.y2 - 7)
					.addPoint(0, this._bounds2d.y2 - 2)
					.addPoint(-this._bounds2d.x2, this._bounds2d.y2 - 7);
			
			// Scale the polygon by the box2d scale ratio
			collisionPoly.divide($ige.engine.box2d._scaleRatio);
			
			// Now convert this polygon into an array of triangles
			this.triangles = collisionPoly.triangulate();
			
			// Create an array of box2d fixture definitions
			// based on the triangles
			fixDefs = [];
			
			for (var i = 0; i < this.triangles.length; i++) {
				fixDefs.push({
					density: 0.2,
					friction: 1.0,
					restitution: 0.2,
					filter: {
						categoryBits: 0x0001,
						maskBits: 0xffff & ~0x0008
					},
					shape: {
						type: 'polygon',
						data: this.triangles[i]
					}
				});
			}
			
			// Create box2d body for this object
			self.box2dBody({
				type: 'dynamic',
				linearDamping: self._publicGameData.state.linearDamping.min,
				angularDamping: 0.5,
				allowSleep: true,
				bullet: false,
				gravitic: true,
				fixedRotation: false,
				fixtures: fixDefs
			});
		},
		/* CEXCLUDE */
		
		/**
		 * Called every frame by the engine when this entity is mounted to the
		 * scenegraph.
		 * @param ctx The canvas context to render to.
		 */
		update: function (ctx, tickDelta) {
			if (!$ige.isServer) {
				if (this.streamProperty('thrusting')) {
					this.thrustEmitter.start();
				} else {
					this.thrustEmitter.stop();
				}
			}
			
			GameEntity.prototype.update.call(this, ctx, tickDelta);
		}
	});
	
	return Ship;
});