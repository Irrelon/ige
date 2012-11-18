var ThrustParticle = IgeEntityBox2d.extend({
	classId: 'ThrustParticle',

	init: function (emitter) {
		this._emitter = emitter;
		this._super();

		// Set the rectangle colour (this is read in the Rectangle.js smart texture)
		this._rectColor = '#ff5a00';

		// Setup the particle default values
		this.addComponent(IgeVelocityComponent)
			.texture(ige.client.textures.rectangle)
			.width(5)
			.height(5)
			.layer(1)
			.group('thrustParticle');

		// Setup the box2d physics properties
		this.box2dBody({
			type: 'dynamic',
			linearDamping: 0.0,
			angularDamping: 0.1,
			allowSleep: true,
			bullet: true,
			gravitic: true,
			fixedRotation: true,
			fixtures: [{
				density: 1.0,
				friction: 0.5,
				restitution: 1.0,
				filter: {
					categoryBits: 0x0004,
					maskBits: 0xffff & ~0x0002 & ~0x0004
				},
				shape: {
					type: 'circle'
				}
			}]
		});
	},

	destroy: function () {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			this._emitter._particles.pull(this);
		}
		this._super();
	}
});