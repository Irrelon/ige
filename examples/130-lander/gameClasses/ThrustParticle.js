var ThrustParticle = IgeEntity.extend({
	classId: 'ThrustParticle',

	init: function (emitter) {
		this._emitter = emitter;
		this._super();

		// Setup the particle default values
		this.addComponent(IgeVelocityComponent)
			.texture(ige.client.textures.rectangle)
			.width(5)
			.height(5)
			.drawBounds(false)
			.drawBoundsData(false);
	},

	destroy: function () {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			this._emitter._particles.pull(this);
		}
		this._super();
	}
});