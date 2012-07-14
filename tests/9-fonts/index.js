var Game = IgeClass.extend({
	classId: 'Game',

	init: function (App) {
		// Create the engine
		ige = new IgeEngine();

		if (!ige.isServer) {
			ige.client = new App();
		}

		if (ige.isServer) {
			ige.server = new App();
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Game; } else { var game = new Game(Client); }