"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeCuboid', function (IgeEntity, IgeTexture, IgeCuboidSmartTexture) {
	var IgeCuboid = IgeEntity.extend({
		classId: 'IgeCuboid',
		
		init: function () {
			IgeEntity.prototype.init.call(this);
			
			this.bounds3d(40, 40, 40);
			
			var tex = new IgeTexture(IgeCuboidSmartTexture);
			this.texture(tex);
		}
	});
	
	return IgeCuboid;
});