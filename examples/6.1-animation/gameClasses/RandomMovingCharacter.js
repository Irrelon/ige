var RandomMovingCharacter = Character.extend({
	classId: 'RandomMovingCharacter',

	tick: function (ctx) {
		if (this.data('moving') === false) {
			this.walkTo(
				(Math.random() * ige._geometry.x) - ige._geometry.x2,
				(Math.random() * ige._geometry.y) - ige._geometry.y2
			);
		}

		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = RandomMovingCharacter; }