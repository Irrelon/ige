var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this;
		self.gameTexture = [];

		this.obj = [];

		// Load the sprite sheet texture and store it in the gameTexture array
		self.gameTexture[0] = new IgeSpriteSheet('../assets/textures/tiles/future-joy-tilee.png', [
			[5, 32, 22, 31],
			[128, 101, 96, 52]
		]);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d();

					// Create the main viewport and set the scene
					// it will "look" at as the new scene1 we just
					// created above
					self.vp1 = new IgeViewport()
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					// Create an entity and mount it to the scene
					self.obj[0] = new IgeEntity()
						.id('sprite1')
						.depth(1)
						.texture(self.gameTexture[0])
						.cell(1)
						.dimensionsFromCell()
						.translateTo(0, 0, 0)
						.mount(self.scene1);

					self.obj[1] = new IgeEntity()
						.id('sprite2')
						.depth(1)
						.texture(self.gameTexture[0])
						.cell(2)
						.dimensionsFromCell()
						.translateTo(100, 0, 0)
						.mount(self.scene1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }