"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeCuboidSmartTexture', function () {
	var IgeCuboidSmartTexture = {
		render: function (ctx, entity) {
			var poly = entity.localIsoBoundsPoly();
			
			ctx.strokeStyle = '#a200ff';
			
			poly.render(ctx);
		}
	};
	
	return IgeCuboidSmartTexture;
});