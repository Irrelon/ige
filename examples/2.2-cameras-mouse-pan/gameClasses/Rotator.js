var Rotator = IgeEntity.extend({
	classId:'Rotator',

	tick: function (ctx) {
		this.rotateBy(0, 0, (0.1 * igeTime._tickDelta) * Math.PI / 180);
		IgeEntity.prototype.tick.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Rotator; }