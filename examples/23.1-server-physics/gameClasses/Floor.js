var Floor = IgeEntityBox2d.extend({
	classId: 'Floor',

	init: function () {
		IgeEntityBox2d.prototype.init.call(this);

		var self = this;

		if (ige.isClient) {
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
		IgeEntityBox2d.prototype.tick.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Floor; }