var Circle = IgeEntityBox2d.extend({
	classId: 'Circle',

	init: function () {
		this._super();

		var self = this;

		if (!ige.isServer) {
			// Define the texture this entity will use
			self.texture(ige.client.gameTexture.circle)
				.width(40)
				.height(40);
		}
	},

	tick: function (ctx) {
		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Circle; }