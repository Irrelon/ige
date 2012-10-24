var Square = IgeEntityBox2d.extend({
	classId: 'Square',

	init: function () {
		this._super();

		var self = this;

		if (!ige.isServer) {
			// Define the texture this entity will use
			self.texture(ige.client.gameTexture.rect)
				.width(40)
				.height(40);
		}
	},

	tick: function (ctx) {
		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Square; }