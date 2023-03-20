var appCore = require('../../../ige');

appCore.module('Target', function ($ige, $textures, IgeEntity) {
	var Target = IgeEntity.extend({
		classId: 'Target',
		
		init: function () {
			IgeEntity.prototype.init.call(this);
			
			this.texture($textures.get('target'))
				.width(50)
				.height(50)
				.mount($ige.engine.$('frontScene'));
		},
		
		update: function (ctx) {
			if (this._targetEntity) {
				if (this._targetEntity.alive()) {
					this.translateToPoint(this._targetEntity._translate);
				} else {
					// Remove the target entity from the target as the target entity
					// is now dead
					this._targetEntity = undefined;
				}
			}
			
			IgeEntity.prototype.update.call(this, ctx);
		}
	});
	
	return Target;
});