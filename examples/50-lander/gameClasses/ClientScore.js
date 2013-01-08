var ClientScore = IgeFontEntity.extend({
	classId: 'ClientScore',

	init: function (score) {
		IgeFontEntity.prototype.init.call(this);

		this.depth(1)
			.width(480)
			.height(110)
			.texture(ige.client.textures.font)
			.textAlignX(1)
			.textLineSpacing(0)
			.text(score)
			.hide();
	},

	start: function (inMs) {
		var self = this;
		if (inMs) {
			setTimeout(function () { self.start(); }, inMs);
			return;
		}

		this.show();

		this._translate.tween()
			.duration(3000)
			.properties({
				y: this._translate.y - 100
			})
			.easing('outElastic')
			.afterTween(function () {
				self.tween()
					.duration(500)
					.properties({
						_opacity: 0
					})
					.afterTween(function () {
						self.destroy();
					})
					.start();
			})
			.start();

		this._rotate.tween()
			.duration(2000)
			.properties({z: Math.radians(360)})
			.easing('outElastic')
			.start();
	}
});