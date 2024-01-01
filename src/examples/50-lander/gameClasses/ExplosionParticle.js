var ExplosionParticle = ThrustParticle.extend({
	classId: 'ExplosionParticle',

	init: function (emitter) {
		this._emitter = emitter;
		ThrustParticle.prototype.init.call(this);

		// Set the rectangle colour (this is read in the Rectangle.js smart texture)
		var pC = Math.floor(Math.random() * 3);
		if (pC === 0) {
			this._rectColor = '#ff5a00';
		}
		if (pC === 1) {
			this._rectColor = '#c1c1c1';
		}
		if (pC === 2) {
			this._rectColor = '#fffc00';
		}

		// Setup the particle default values
		this.addComponent(IgeVelocityComponent)
			.texture(ige.client.textures.rectangle)
			.width(5)
			.height(5)
			.layer(1)
			.category('thrustParticle');

		// Setup the box2d physics properties
		/*this.box2dBody({
			type: 'dynamic',
			linearDamping: 0.0,
			angularDamping: 0.1,
			allowSleep: true,
			bullet: true,
			gravitic: true,
			fixedRotation: true,
			fixtures: [{
				density: 0.1,
				friction: 0.5,
				restitution: 0.1,
				filter: {
					categoryBits: 0x0008,
					maskBits: 0xffff & ~0x0004 & ~0x0008
				},
				shape: {
					type: 'rectangle'
				}
			}]
		});*/
	},

	destroy: function () {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			this._emitter._particles.pull(this);
		}
		ThrustParticle.prototype.destroy.call(this);
	}
});