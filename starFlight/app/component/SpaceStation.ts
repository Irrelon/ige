var appCore = require('../../../ige');

appCore.module('SpaceStation', function ($ige, $textures, IgeEntityBox2d, IgeVelocityComponent) {
	var SpaceStation = IgeEntityBox2d.extend({
		classId: 'SpaceStation',
		
		init: function (publicGameData) {
			IgeEntityBox2d.prototype.init.call(this);
			
			var self = this;
			
			publicGameData = publicGameData || {};
			self._publicGameData = publicGameData;
			
			self.layer(0)
				.width(948)
				.height(708);
			//.box2dNoDebug(true);
			
			/* CEXCLUDE */
			if ($ige.isServer) {
				this.addComponent(IgeVelocityComponent);
			}
			/* CEXCLUDE */
			
			if ($ige.engine.box2d) {
				// Create box2d body for this object
				self.box2dBody({
					type: 'dynamic',
					linearDamping: 0.0,
					angularDamping: 0.5,
					allowSleep: true,
					bullet: false,
					gravitic: true,
					fixedRotation: false,
					fixtures: [{
						isSensor: true,
						density: 1.0,
						friction: 1.0,
						restitution: 0.2,
						shape: {
							type: 'circle'
						}
					}]
				});
			}
			
			if ($ige.isClient) {
				self.texture($textures.get(publicGameData.texture));
			}
		},
		
		streamCreateData: function () {
			return this._publicGameData;
		}
	});
	
	return SpaceStation;
});