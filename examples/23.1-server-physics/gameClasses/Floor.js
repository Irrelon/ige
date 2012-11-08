var Floor = IgeEntityBox2d.extend({
	classId: 'Floor',

	init: function () {
		this._super();

		var self = this;

		if (!ige.isServer) {
			// Define the texture this entity will use
			this._tex = new IgeTexture('./assets/Rect.js');

			// Wait for the texture to load
			this._tex.on('loaded', function () {
				self.texture(self._tex);

				self.width(880)
					.height(20);
			});
		}
	},

	tick: function (ctx) {
		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Floor; }