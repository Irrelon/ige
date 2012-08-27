var IgeCollisionMap2d = IgeEntity.extend({
	classId: 'IgeCollisionMap2d',

	init: function (tileWidth, tileHeight) {
		this._super();
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

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeCollisionMap2d; }