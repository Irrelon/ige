var appCore = require('../../../../ige');

appCore.module('ThrustParticle', function ($ige, $textures, IgeEntityBox2d, IgeVelocityComponent) {
	var ThrustParticle = IgeEntityBox2d.extend({
		classId: 'ThrustParticle',
		
		init: function (emitter) {
			var self = this;
			
			self._emitter = emitter;
			IgeEntityBox2d.prototype.init.call(this);
			
			// Setup the particle default values
			self.addComponent(IgeVelocityComponent)
				.texture($textures.get('explosions1'))
				.cell(9)
				.width(15)
				.height(15)
				.layer(2)
				.depth(2)
				.category('thrustParticle');
		},
		
		destroy: function () {
			// Remove ourselves from the emitter
			if (this._emitter !== undefined) {
				this._emitter._particles.pull(this);
			}
			
			IgeEntityBox2d.prototype.destroy.call(this);
		}
	});
	
	return ThrustParticle;
});