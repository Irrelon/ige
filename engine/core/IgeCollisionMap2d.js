"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeCollisionMap2d', function (IgeEntity, IgeMap2d) {
	var IgeCollisionMap2d = IgeEntity.extend({
		classId: 'IgeCollisionMap2d',
		
		init: function (tileWidth, tileHeight) {
			IgeEntity.prototype.init.call(this);
			var self = this;
			
			this.map = new IgeMap2d();
		},
		
		mapData: function (val) {
			if (val !== undefined) {
				this.map.mapData(val);
				return this;
			}
			
			return this.map.mapData();
		}
	});
	
	return IgeCollisionMap2d;
});