var RandomMovingCharacter = Character.extend({
	classId: 'RandomMovingCharacter',

	update: function (ctx, tickDelta) {
		if (this.data('moving') === false) {
			this.walkTo(
				(Math.random() * ige.bounds.bounds2d().x) - ige.bounds.bounds2d().x2,
				(Math.random() * ige.bounds.bounds2d().y) - ige.bounds.bounds2d().y2
			);
		}

		Character.prototype.update.call(this, ctx, tickDelta);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = RandomMovingCharacter; }