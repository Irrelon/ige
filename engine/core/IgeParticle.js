var IgeParticle = IgeEntity.extend({
	classId: 'IgeParticle',
	
	init: function (emitter) {
		this._emitter = emitter;
		IgeEntity.prototype.init.call(this);

		// Setup the particle default values
		this.addComponent(IgeVelocityComponent);
	},

	destroy: function () {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			this._emitter._particles.pull(this);
		}
		IgeEntity.prototype.destroy.call(this);
	}
});