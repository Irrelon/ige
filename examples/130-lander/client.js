var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
		ige.input.debug(true);

		var self = this;
		self.obj = [];
		self.textures = {};

		// Load textures
		self.textures.ship = new IgeTexture('./assets/Ship.js');
		self.textures.rectangle = new IgeTexture('./assets/Rectangle.js');

		// Implement our externally declared methods
		self.implement(ClientWorld);
		self.implement(ClientTerrain);

		// Add physics and setup physics world
		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.gravity(0, 1)
			.box2d.createWorld()
			.box2d.mode(0)
			.box2d.start();

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					self.createWorld();
					self.createTerrain();

					// Define our player controls
					ige.input.mapAction('left', ige.input.key.left);
					ige.input.mapAction('right', ige.input.key.right);
					ige.input.mapAction('thrust', ige.input.key.up);

					self.obj[0] = new Player()
						.addBehaviour('PlayerControl', PlayerBehaviour)
						.mount(self.objectScene);

					// Add the box2d debug painter entity to the
					// scene to show the box2d body outlines
					//ige.box2d.enableDebug(self.mainScene);

					self.vp1.camera.trackTranslate(self.obj[0], 20);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }