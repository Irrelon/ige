/**
 * Creates a new isometric 3d entity.
 */
var IgeEntityBox2d = IgeEntity.extend({
	classId: 'IgeEntityBox2d',

	init: function () {
		this._super();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntity3d; }