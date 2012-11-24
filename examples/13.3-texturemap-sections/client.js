var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
		ige.globalSmoothing(true);

		var self = this;
		self.obj = [];

		// Load our textures
		self.gameTexture = {};
		//self.gameTexture.grassSheet = new IgeCellSheet('../assets/textures/tiles/tilea5b.png', 8, 16);
		self.gameTexture.grassSheet = new IgeCellSheet('../assets/textures/tiles/grassSheet.png', 4, 1);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.mainScene = new IgeScene2d()
						.id('mainScene')
						.translateTo(20, 0, 0)
						.drawBounds(false);

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.addComponent(IgeMousePanComponent)
						.mousePan.enabled(true)
						.id('vp1')
						.autoSize(true)
						.scene(self.mainScene)
						.drawBounds(true)
						.mount(ige);

					//self.vp1.camera.translateTo(303, 283, 0);

					// Create the texture maps
					self.textureMap1 = new IgeTextureMap()
						.depth(0)
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(3)
						//.drawMouse(true)
						.translateTo(0, 0, 0)
						.drawBounds(false)
						.autoSection(10)
						.drawSectionBounds(true)
						.isometricMounts(true)
						.mount(self.mainScene);

					var texIndex = self.textureMap1.addTexture(self.gameTexture.grassSheet);

					// Generate some random data, large amounts of it
					for (var x = 0; x < 8; x++) {
						for (var y = 0; y < 8; y++) {
							var rand = Math.ceil(Math.random() * 4);
							self.textureMap1.paintTile(x, y, texIndex, rand);
						}
					}
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }