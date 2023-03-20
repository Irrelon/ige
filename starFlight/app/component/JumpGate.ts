var appCore = require('../../../ige');

appCore.module('JumpGate', function ($ige, $textures, IgeEntity) {
	var JumpGate = IgeEntity.extend({
		classId: 'JumpGate',
		
		init: function (publicGameData) {
			IgeEntity.prototype.init.call(this);
			
			var self = this;
			
			publicGameData = publicGameData || {};
			self._publicGameData = publicGameData;
			
			self.layer(0)
				.width(400)
				.height(380);
			
			if ($ige.isClient) {
				self.texture($textures.get(publicGameData.texture));
			}
		},
		
		streamCreateData: function () {
			return this._publicGameData;
		}
	});
	
	return JumpGate;
});