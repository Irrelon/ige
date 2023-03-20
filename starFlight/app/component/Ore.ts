var appCore = require('../../../ige');

appCore.module('Ore', function ($ige, $textures, $game, IgeEntityBox2d, IgeAnimationComponent) {
	var Ore = IgeEntityBox2d.extend({
		classId: 'Ore',
		
		init: function (publicGameData) {
			var self = this;
			
			IgeEntityBox2d.prototype.init.call(this);
			
			self.category('ore')
				.depth(10);
			
			publicGameData = publicGameData || {};
			self._publicGameData = publicGameData;
			
			self.layer(1)
				.width(25)
				.height(25);
			
			if ($ige.engine.box2d) {
				// Create box2d body for this object
				self.box2dBody({
					type: 'dynamic',
					linearDamping: 0.7,
					angularDamping: 0.2,
					allowSleep: true,
					bullet: false,
					gravitic: true,
					fixedRotation: false,
					fixtures: [{
						density: 1.0,
						friction: 0,
						restitution: 0.8,
						filter: {
							categoryBits: 0x0008,
							maskBits: 0xffff
						},
						shape: {
							type: 'circle'
						}
					}]
				});
			}
			
			if (!$ige.isServer) {
				self.texture($textures.get('ore1'));
				
				self.addComponent(IgeAnimationComponent)
					.animation.define('ore', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 25, -1)
					.animation.start('ore');
			}
		},
		
		streamCreateData: function () {
			return this._publicGameData;
		}
	});
	
	return Ore
});