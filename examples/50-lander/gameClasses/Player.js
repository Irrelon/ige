var Player = IgeEntityBox2d.extend({
	classId: 'Player',

	init: function (id) {
		this._super();
		var self = this;

		self._thrustPower = 0.5;

		self.controls = {
			left: false,
			right: false,
			thrust: false
		};

		self.id(id);
		self.addComponent(IgeVelocityComponent)
			.group('ship')
			.texture(ige.client.textures.ship)
			.width(20)
			.height(20);

		// Define the polygon for collision
		var collisionPoly = new IgePoly2d()
			.addPoint(0, -this._geometry.y2)
			.addPoint(this._geometry.x2, this._geometry.y2)
			.addPoint(0, this._geometry.y2 - 5)
			.addPoint(-this._geometry.x2, this._geometry.y2);

		// Scale the polygon by the box2d scale ratio
		collisionPoly.divide(ige.box2d._scaleRatio);

		// Now convert this polygon into an array of triangles
		var triangles = collisionPoly.triangulate();
		this.triangles = triangles;

		// Create an array of box2d fixture definitions
		// based on the triangles
		var fixDefs = [];

		for (var i = 0; i < this.triangles.length; i++) {
			fixDefs.push({
				density: 1.0,
				friction: 1.0,
				restitution: 0.2,
				filter: {
					categoryBits: 0x0004,
					maskBits: 0xffff & ~0x0008
				},
				shape: {
					type: 'polygon',
					data: this.triangles[i]
				}
			});
		}

		// Setup the box2d physics properties
		self.box2dBody({
			type: 'dynamic',
			linearDamping: 0.0,
			angularDamping: 0.5,
			allowSleep: true,
			bullet: true,
			gravitic: true,
			fixedRotation: false,
			fixtures: fixDefs
		});

		// Add a particle emitter for the thrust particles
		self.thrustEmitter = new IgeParticleEmitter()
			// Set the particle entity to generate for each particle
			.particle(ThrustParticle)
			// Set particle life to 300ms
			.lifeBase(300)
			// Set output to 60 particles a second (1000ms)
			.quantityBase(60)
			.quantityTimespan(1000)
			// Set the particle's death opacity to zero so it fades out as it's lifespan runs out
			.deathOpacityBase(0)
			// Set velocity vector to y = 0.05, with variance values
			.velocityVector(new IgePoint(0, 0.05, 0), new IgePoint(-0.04, 0.05, 0), new IgePoint(0.04, 0.15, 0))
			// Mount new particles to the object scene
			.particleMountTarget(ige.client.objectScene)
			// Move the particle emitter to the bottom of the ship
			.translateTo(0, 5, 0)
			// Mount the emitter to the ship
			.mount(self);

		// Test particle emitter
		/*new IgeParticleEmitter()
			// Set the particle entity to generate for each particle
			.particle(ExplosionParticle)
			// Set particle life to 600ms
			.lifeBase(600)
			// Set output to 60 particles a second (1000ms)
			.quantityBase(100)
			.quantityTimespan(300)
			// Set the particle's death opacity to zero so it fades out as it's lifespan runs out
			.deathOpacityBase(0)
			// Set velocity vector to y = 0.05, with variance values
			.velocityVector(new IgePoint(0, -0.1, 0), new IgePoint(-0.1, -0.1, 0), new IgePoint(0.1, 0.1, 0))
			// Set a linear force vector so the particles get "dragged" down
			.linearForceVector(new IgePoint(0, 0.5, 0))
			// Mount new particles to the object scene
			.particleMountTarget(ige.client.objectScene)
			// Set a lifespan so the emitter removes itself
			//.lifeSpan(400)
			// Mount the emitter to the ship
			.mount(ige.client.objectScene)
			// Move the particle emitter to the bottom of the ship
			.translateTo(this._translate.x, this._translate.y, 0)
			// Start the emitter
			.start();*/
	},

	crash: function () {
		var self = this;

		// The player crashed
		// Create a particle emitter at this location then remove the ship,
		// set a timer and reset the player
		new IgeParticleEmitter()
			// Set the particle entity to generate for each particle
			.particle(ExplosionParticle)
			// Set particle life to 600ms
			.lifeBase(400)
			// Set output to 60 particles a second (1000ms)
			.quantityBase(100)
			.quantityTimespan(150)
			// Set the particle's death opacity to zero so it fades out as it's lifespan runs out
			.deathOpacityBase(0)
			// Set velocity vector to y = 0.05, with variance values
			.velocityVector(new IgePoint(0, -0.1, 0), new IgePoint(-0.1, -0.1, 0), new IgePoint(0.1, 0.1, 0))
			// Set a linear force vector so the particles get "dragged" down
			.linearForceVector(new IgePoint(0, 0.5, 0))
			// Mount new particles to the object scene
			.particleMountTarget(ige.client.objectScene)
			// Set a lifespan so the emitter removes itself
			.lifeSpan(150)
			// Mount the emitter to the ship
			.mount(ige.client.objectScene)
			// Move the particle emitter to the bottom of the ship
			.translateTo(this._translate.x, this._translate.y, 0)
			// Start the emitter
			.start();

		// Remove player from level and disable physics
		this.unMount();
		this._box2dBody.SetAwake(false);
		this._box2dBody.SetActive(false);

		// Create a count down at the death location
		this._countDownText = new ClientCountDown('Respawn in ', 3, 's', 1000)
			.translateTo(this._translate.x, this._translate.y, 0)
			.mount(ige.client.objectScene)
			.start();

		// Hook the complete event so we can schedule a respawn
		this._countDownText.on('complete', function () { self.respawn(); });
	},

	respawn: function () {
		// Remove countdown text
		this._countDownText.destroy();

		// Reset player transform
		this.rotateTo(0, 0, 0)
			.translateTo(ige.client.landingPads[0]._translate.x, ige.client.landingPads[0]._translate.y - 20, 0)
			.mount(ige.client.objectScene);

		// Reset physics
		this._box2dBody.SetAngularVelocity(0);
		this._box2dBody.SetLinearVelocity(new IgePoint(0, 0, 0));
		this._box2dBody.SetActive(true);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Player; }