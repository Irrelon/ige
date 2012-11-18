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

		// Define the polygon for collision, we need two because box2d
		// does not support concave shapes and our ship has a concave
		// section at the bottom so we create two convex polygons to
		// create a single composite concave shape
		var collisionPoly1, collisionPoly2;

		collisionPoly1 = new IgePoly2d()
			.addPoint(0, -this._geometry.y2)
			.addPoint(0, this._geometry.y2 - 5)
			.addPoint(-this._geometry.x2, this._geometry.y2);

		collisionPoly2 = new IgePoly2d()
			.addPoint(0, -this._geometry.y2)
			.addPoint(this._geometry.x2, this._geometry.y2)
			.addPoint(0, this._geometry.y2 - 5);

		// Scale the polygon by the box2d scale ratio
		collisionPoly1.divide(ige.box2d._scaleRatio);
		collisionPoly2.divide(ige.box2d._scaleRatio);

		// Setup the box2d physics properties
		self.box2dBody({
			type: 'dynamic',
			linearDamping: 0.0,
			angularDamping: 0.5,
			allowSleep: true,
			bullet: true,
			gravitic: true,
			fixedRotation: false,
			fixtures: [{
				density: 1.0,
				friction: 1.0,
				restitution: 0.2,
				filter: {
					categoryBits: 0x0002,
					maskBits: 0xffff & ~0x0004
				},
				shape: {
					type: 'polygon',
					data: collisionPoly1
				}
			}, {
				density: 1.0,
				friction: 1.0,
				restitution: 0.2,
				filter: {
					categoryBits: 0x0002,
					maskBits: 0xffff & ~0x0004
				},
				shape: {
					type: 'polygon',
					data: collisionPoly2
				}
			}]
		});

		// Add a particle emitter for the thrust particles
		self.thrustEmitter = new IgeParticleEmitter()
			// Set the particle entity to generate for each particle
			.particle(ThrustParticle)
			// Set particle life to 300ms
			.lifeBase(600)
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
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Player; }