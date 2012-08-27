var IgePathNode = IgeClass.extend({
	init: function(x, y, parentIndex) {
		this.x = x;
		this.y = y;
		this.parentIndex = parentIndex;
		this.g = -1;
		this.h = -1;
		this.f = -1;
		this.hash = x + ',' + y;
		this.closed = false;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePathNode; }