/**
 * Creates a new path node for use with the IgePathFinder class.
 */
var IgePathNode = IgePoint.extend({
	classId: 'IgePathNode',

	/**
	 * @constructor
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} g
	 * @param {Number} moveCost
	 * @param {Number} h
	 * @param {Object} parent
	 * @param {String} direction
	 */
	init: function(x, y, g, moveCost, h, parent, direction) {
		this.z = 0; // Compat with IgePoint
		
		this.x = x;
		this.y = y;
		this.g = g + moveCost; // Cost of moving from the start point along the path to this node (parentNode.g + moveCost)
		this.h = h; // Rough distance to target node
		this.moveCost = moveCost;
		this.f = g + h; // Result of g + h
		this.link = parent;
		this.hash = x + ',' + y;
		this.listType = 0;
		this.direction = direction;
		this.mode = 0;
	},

	/**
	 * Gets / sets the path node mode. The mode determines if the co-ordinates
	 * will be in tile or absolute co-ordinates.
	 * @param {Number=} val 0 = tile based, 1 = absolute based.
	 * @return {*}
	 */
	mode: function (val) {
		if (val !== undefined) {
			this.mode = val;
			return this;
		}
		
		return this.mode;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePathNode; }