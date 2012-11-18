var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
		ige.input.debug(true);

		var self = this;
		self.obj = [];
		self.textures = {};
		self.textures.ship = new IgeTexture('./assets/Ship.js');

		// Implement our externally declared methods
		self.implement(ClientWorld);

		// Add physics and setup physics world
		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.gravity(0, 1)
			.box2d.createWorld();

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					self.createWorld();

					// Define our player controls
					ige.input.mapAction('left', ige.input.key.left);
					ige.input.mapAction('right', ige.input.key.right);
					ige.input.mapAction('thrust', ige.input.key.up);

					new Player()
						.addBehaviour('PlayerControl', PlayerBehaviour)
						.mount(self.objectScene);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }