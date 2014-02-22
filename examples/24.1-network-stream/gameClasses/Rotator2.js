var Rotator2 = Rotator.extend({
	classId: 'Rotator2',

	init: function (speed) {
		Rotator.prototype.init.call(this, speed);
		var self = this;

		if (ige.isClient) {
			this._tex.on('loaded', function () {
				self.width(50)
					.height(50);
			});
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Rotator2; }