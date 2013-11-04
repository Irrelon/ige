var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		var self = this;
		ige.showStats(1);
		ige.input.debug(true);

		// Load our textures
		self.obj = [];

		// Load the ship texture and store it in the gameTexture object
		self.gameTexture = {};
		self.gameTexture.ship = new IgeTexture('./assets/PlayerTexture.js');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Load the base scene data
					ige.addGraph('IgeBaseScene');

					ige.$('vp1').camera.translateTo(200, 200, 0);

					// Create an entity and mount it to the scene
					self.obj[0] = new IgeEntity()
						.id('ship1')
						.depth(1)
						.width(30)
						.height(30)
						.texture(self.gameTexture.ship)
						.translateTo(400, 200, 0)
						.addBehaviour('mouseAim', MouseAim)
						.mount(ige.$('baseScene'));
					
					self.obj[1] = new IgeEntity()
						.id('ship2')
						.depth(1)
						.width(10)
						.height(10)
						.texture(self.gameTexture.ship)
						.translateTo(0, 0, 0)
						.addBehaviour('mouseAim', MouseAim)
						.mount(self.obj[0]);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }