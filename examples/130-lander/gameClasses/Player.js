var Player = IgeEntityBox2d.extend({
	classId: 'Player',

	init: function (id) {
		this._super();
		var self = this;

		self._thrustPower = 1;

		self.controls = {
			left: false,
			right: false,
			thrust: false
		};

		self.id(id);
		self.addComponent(IgeVelocityComponent)
			.texture(ige.client.textures.ship)
			.width(20)
			.height(20);

		// Setup the box2d physics properties
		self.box2dBody({
			type: 'dynamic',
			linearDamping: 0.0,
			angularDamping: 0.1,
			allowSleep: true,
			bullet: false,
			gravitic: true,
			fixedRotation: false,
			fixtures: [{
				density: 1.0,
				friction: 0.5,
				restitution: 0.2,
				shape: {
					type: 'circle'
				}
			}]
		});

		// Add a particle emitter for the thrust particles
		self.thrustEmitter = new IgeParticleEmitter()
			.particle(ThrustParticle)
			.lifeBase(400)
			.quantityTimespan(1000)
			.quantityBase(60)
			.velocityVector(new IgePoint(0, 0.1, 0), new IgePoint(-0.05, 0.1, 0), new IgePoint(0.05, 0.05, 0))
			.particleMountTarget(ige.client.objectScene)
			.deathOpacityBase(0)
			.translateTo(0, 3, 0)
			.mount(self);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Player; }