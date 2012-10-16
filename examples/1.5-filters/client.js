var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		// Load the fairy texture a few times and store it in the gameTexture array
		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[1] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[2] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[3] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[4] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[5] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[6] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[7] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[8] = new IgeTexture('../assets/textures/sprites/fairy.png');

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
					self.obj[0] = new Rotator()
						.id('fairy0')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.translateTo(0, -150, 0)
						.mount(self.scene1);

					// Create a second rotator entity and mount
					// it to the first one at 0, 50 relative to the
					// parent
					self.obj[1] = new Rotator()
						.id('fairy1')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[1])
						.translateTo(-300, 0, 0)
						.mount(self.scene1);

					// Create some more fairies and mount them to the scene
					self.obj[2] = new Rotator()
						.id('fairy2')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[2])
						.translateTo(-150, 0, 0)
						.mount(self.scene1);

					self.obj[3] = new Rotator()
						.id('fairy3')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[3])
						.translateTo(0, 0, 0)
						.mount(self.scene1);

					self.obj[4] = new Rotator()
						.id('fairy4')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[4])
						.translateTo(150, 0, 0)
						.mount(self.scene1);

					self.obj[5] = new Rotator()
						.id('fairy5')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[5])
						.translateTo(300, 0, 0)
						.mount(self.scene1);

					self.obj[6] = new Rotator()
						.id('fairy6')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[6])
						.translateTo(-300, 150, 0)
						.mount(self.scene1);

					self.obj[7] = new Rotator()
						.id('fairy7')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[7])
						.translateTo(-150, 150, 0)
						.mount(self.scene1);

					self.obj[8] = new Rotator()
						.id('fairy8')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[8])
						.translateTo(0, 150, 0)
						.mount(self.scene1);

					// Apply a greyscale filter to JUST the first fairy texture
					gameTexture[1].applyFilter(IgeFilters.greyScale);

					// Apply a brighten filter to the second fairy texture
					gameTexture[2].data('IgeFilters.brighten.value', 100);
					gameTexture[2].applyFilter(IgeFilters.brighten);

					// Apply a threshold filter to the third fairy texture
					gameTexture[3].data('IgeFilters.threshold.value', 128);
					gameTexture[3].applyFilter(IgeFilters.threshold);

					// Apply a sharpen filter to the fourth fairy texture
					gameTexture[4].applyFilter(IgeFilters.sharpen);

					// Apply a blur filter to the fifth fairy texture
					gameTexture[5].applyFilter(IgeFilters.blur);

					// Apply an emboss filter to the sixth fairy texture
					gameTexture[6].applyFilter(IgeFilters.emboss);

					// Apply an emboss filter to the seventh fairy texture
					gameTexture[7].applyFilter(IgeFilters.edgeDetect);

					// Apply a colour overlay filter to the eighth fairy texture
					gameTexture[8].applyFilter(IgeFilters.colorOverlay, {color: 'rgba(255, 0, 0, 0.5)'});
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }