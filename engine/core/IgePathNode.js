var IgePathNode = IgeClass.extend({
	init: function(x, y, score) {
		this.x = x;
		this.y = y;
		this.score = score;
		this.g = 0;
		this.h = 0;
		this.f = 0;
		this.link = null;
		//this.hash = x + ',' + y;
		//this.closed = false;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePathNode; }