var Circle = IgeEntityBox2d.extend({
	classId: "Circle",

	init: function () {
		IgeEntityBox2d.prototype.init.call(this);

		var self = this;

		if (isClient) {
			// Define the texture this entity will use
			self.texture(ige.client.gameTexture.circle).width(40).height(40);
		}
	},

	tick: function (ctx) {
		IgeEntityBox2d.prototype.tick.call(this, ctx);
	}
});

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = Circle;
}
