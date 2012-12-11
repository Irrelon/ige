var Rotator2 = Rotator.extend({
	classId: 'Rotator2',

	init: function (speed) {
		this._super(speed);
		var self = this;

		if (!ige.isServer) {
			this._tex.on('loaded', function () {
				self.width(50)
					.height(50);
			});
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Rotator2; }