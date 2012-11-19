var ClientScore = IgeFontEntity.extend({
	classId: 'ClientScore',

	init: function (score) {
		this._super();

		this.depth(1)
			.width(480)
			.height(110)
			.texture(ige.client.textures.font)
			.textAlignX(1)
			.textLineSpacing(0)
			.text(score);
	},

	start: function () {
		var self = this;

		this._translate.tween()
			.duration(3000)
			.properties({
				y: this._translate.y - 100
			})
			.easing('outElastic')
			.afterTween(function () {
				self.destroy();
			})
			.start();

		this._rotate.tween()
			.duration(2000)
			.properties({z: Math.radians(360)})
			.easing('outElastic')
			.start();
	}
});