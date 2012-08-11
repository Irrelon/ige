var RandomMovingCharacter = Character.extend({
	classId: 'RandomMovingCharacter',

	tick: function (ctx) {
		if (this.data('moving') === false) {
			this.walkTo(
				(Math.random() * ige.geometry.x) - ige.geometry.x2,
				(Math.random() * ige.geometry.y) - ige.geometry.y2
			);
		}

		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = RandomMovingCharacter; }