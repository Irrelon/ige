var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[1] = new IgeCellSheet('../assets/textures/tiles/grassSheet.png', 4, 1);
		gameTexture[2] = new IgeCellSheet('../assets/textures/tiles/tilea5b.png', 8, 16);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d()
						.translateTo(0, 0, 0)
						.drawBounds(false);

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					ige.addComponent(IgeTiledComponent)
						.tiled.loadJson('maps/example.js', function (newScene) {
							self.tiledScene = newScene;
							self.tiledScene.mount(self.scene1);
						});
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }