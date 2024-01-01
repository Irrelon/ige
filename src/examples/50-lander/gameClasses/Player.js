var Player = IgeEntityBox2d.extend({
	classId: 'Player',

	init: function (id) {
		IgeEntityBox2d.prototype.init.call(this);
		var self = this;

		self._thrustPower = 0.5;
		self._fuel = 100;
		self._score = 0;

		self.controls = {
			left: false,
			right: false,
			thrust: false
		};

		self.id(id);
		self.addComponent(IgeVelocityComponent)
			.category('ship')
			.texture(ige.client.textures.ship)
			.width(20)
			.height(20);

		// Define the polygon for collision
		var triangles,
			fixDefs,
			collisionPoly = new IgePoly2d()
			.addPoint(0, -this._bounds2d.y2)
			.addPoint(this._bounds2d.x2, this._bounds2d.y2)
			.addPoint(0, this._bounds2d.y2 - 5)
			.addPoint(-this._bounds2d.x2, this._bounds2d.y2);

		// Scale the polygon by the box2d scale ratio
		collisionPoly.divide(ige.box2d._scaleRatio);

		// Now convert this polygon into an array of triangles
		triangles = collisionPoly.triangulate();
		this.triangles = triangles;

		// Create an array of box2d fixture definitions
		// based on the triangles
		fixDefs = [];

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

		// Add a sensor to the fixtures so we can detect
		// when the ship is near an orb
		fixDefs.push({
			density: 0.0,
			friction: 0.0,
			restitution: 0.0,
			isSensor: true,
			filter: {
				categoryBits: 0x0008,
				maskBits: 0x0100
			},
			shape: {
				type: 'circle',
				data: {
					radius: 60
				}
			}
		});

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
			.velocityVector(new IgePoint3d(0, 0.05, 0), new IgePoint3d(-0.04, 0.05, 0), new IgePoint3d(0.04, 0.15, 0))
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
			.velocityVector(new IgePoint3d(0, -0.1, 0), new IgePoint3d(-0.1, -0.1, 0), new IgePoint3d(0.1, 0.1, 0))
			// Set a linear force vector so the particles get "dragged" down
			.linearForceVector(new IgePoint3d(0, 0.5, 0))
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

		this.dropOrb();

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
			.velocityVector(new IgePoint3d(0, -0.1, 0), new IgePoint3d(-0.1, -0.1, 0), new IgePoint3d(0.1, 0.1, 0))
			// Set a linear force vector so the particles get "dragged" down
			.linearForceVector(new IgePoint3d(0, 0.5, 0))
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
			.rotateTo(0, 0, -ige.client.vp1.camera._rotate.z)
			.mount(ige.client.objectScene)
			.start();

		// Add a tween on the countdown text for fun!
		this._countDownText._rotate.tween()
			.duration(2000)
			.properties({z: Math.radians(360)})
			.easing('outElastic')
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
		this._box2dBody.SetLinearVelocity(new IgePoint3d(0, 0, 0));
		this._box2dBody.SetActive(true);

		// Reset fuel
		this._fuel = 100;

		new ClientScore('-' + (100) + ' for crash!')
			.colorOverlay('#ff6f6f')
			.translateTo(this._translate.x, this._translate.y + 50, 0)
			.mount(ige.client.objectScene)
			.start();

		this._score -= 100;
	},

	tick: function (ctx) {
		if (this._landed) {
			if (this._fuel < 100) {
				this._fuel += 0.05 * ige._tickDelta;

				if (this._fuel > 100) {
					this._fuel = 100;
				}
			}
		}

		// Scale the camera based on flight height
		var camScale = 1 + (0.1 * (this._translate.y / 100));
		//ige.$('vp1').camera.scaleTo(camScale, camScale, camScale);

		IgeEntityBox2d.prototype.tick.call(this, ctx);

		// If we are carrying an orb draw a connecting line to it
		if (this._carryingOrb) {
			ctx.save();
				ctx.rotate(-this._rotate.z);
				ctx.strokeStyle = '#a6fff6';
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(this._orb._translate.x - this._translate.x, this._orb._translate.y - this._translate.y);
				ctx.stroke();
			ctx.restore();
		}

		// Update the fuel progress bar to show player fuel
		ige.$('player_fuelBar')
			.progress(this._fuel);
			//.translateTo(this._translate.x, this._translate.y - 25, 0);

		ige.$('scoreText').text(this._score + ' points');

		if (this._dropTime < this._currentTime - 2000) {
			// Remove the old orb from memory so we can pick
			// it up again if required
			debugger;
			delete this._oldOrb;
			delete this._dropTime;
		}
	},

	carryOrb: function (orb, contact) {
		if (!this._oldOrb || (this._oldOrb !== orb)) {
			var distanceJointDef = new ige.box2d.b2DistanceJointDef(),
				bodyA = contact.m_fixtureA.m_body,
				bodyB = contact.m_fixtureB.m_body;

			distanceJointDef.Initialize(
				bodyA,
				bodyB,
				bodyA.GetWorldCenter(),
				bodyB.GetWorldCenter()
			);

			this._orbRope = ige.box2d._world.CreateJoint(distanceJointDef);

			this._carryingOrb = true;
			this._orb = orb;

			orb.originalStart(orb._translate);
		}
	},

	dropOrb: function () {
		if (this._carryingOrb) {
			ige.box2d._world.DestroyJoint(this._orbRope);

			this._oldOrb = this._orb;
			this._dropTime = ige._currentTime;

			delete this._orbRope;
			delete this._orb;

			this._carryingOrb = false;
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Player; }