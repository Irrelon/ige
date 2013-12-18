var RandomTweener = IgeEntity.extend({
	classId: 'RandomTweener',

	init: function () {
		IgeEntity.prototype.init.call(this);
		this.newTween();
	},

	/**
	 * Creates a new random position and rotation to tween
	 * to and then starts the tween.
	 */
	newTween: function () {
		var self = this;

		this._translate.tween()
			.duration(7000)
			.properties({
				x: (Math.random() * ige._bounds2d.x) - ige._bounds2d.x2,
				y: (Math.random() * ige._bounds2d.y) - ige._bounds2d.y2
			})
			.easing('outElastic')
			.afterTween(function () {
				self.newTween();
			})
			.start();

		this._rotate.tween()
			.duration(7000)
			.properties({z: (Math.random() * 360) * Math.PI / 180})
			.easing('outElastic')
			.start();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = RandomTweener; }