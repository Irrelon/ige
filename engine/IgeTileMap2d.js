var IgeTileMap2d = IgeEntity.extend({
	init: function () {
		this.map = new IgeMap2d();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTileMap2d; }