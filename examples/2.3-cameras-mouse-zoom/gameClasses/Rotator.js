var Rotator = IgeEntity.extend({
	classId:'Rotator',

	tick: function (ctx) {
		this.rotateBy(0, 0, (0.1 * ige._tickDelta) * Math.PI / 180);
		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Rotator; }