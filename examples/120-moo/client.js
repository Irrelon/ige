var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
		ige.globalSmoothing(true);

		// Load our textures
		var self = this;
		self.gameTexture = {};
		self.obj = [];

		ige.input.debug(true);

		// Load textures
		self.gameTexture.background = new IgeTexture('./assets/background.jpg');
		self.gameTexture.ground = new IgeTexture('./assets/ground.jpg');
		self.gameTexture.groundLine = new IgeTexture('./assets/groundLine.png');
		self.gameTexture.cloud1 = new IgeTexture('./assets/cloud1.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.mainScene = new IgeScene2d()
						.id('mainScene');

					self.backScene = new IgeScene2d()
						.id('backScene')
						.layer(0)
						.mount(self.mainScene);

					// Create the main viewport and set the scene
					// it will "look" at as the new scene1 we just
					// created above
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.mainScene)
						.drawBounds(false)
						.mount(ige);

					new IgeEntity()
						.id('background')
						.layer(0)
						.texture(self.gameTexture.background)
						.dimensionsFromTexture()
						.mount(self.backScene);

					new IgeEntity()
						.id('ground1')
						.layer(1)
						.texture(self.gameTexture.ground)
						.dimensionsFromTexture()
						.translateTo(0, 420, 0)
						.opacity(0.8)
						.mount(self.backScene);

					new IgeEntity()
						.id('groundLine1')
						.texture(self.gameTexture.groundLine)
						.dimensionsFromTexture()
						.translateTo(0, -144, 0)

						.mount(ige.$('ground1'));

					new IgeEntity()
						.id('ground2')
						.layer(2)
						.texture(self.gameTexture.ground)
						.dimensionsFromTexture()
						.translateTo(0, 440, 0)
						.mount(self.backScene);

					new IgeEntity()
						.id('groundLine2')
						.texture(self.gameTexture.groundLine)
						.dimensionsFromTexture()
						.translateTo(0, -144, 0)
						.mount(ige.$('ground2'));

					new IgeEntity()
						.id('cloud1')
						.layer(2)
						.texture(self.gameTexture.cloud1)
						.dimensionsFromTexture()
						.scaleTo(0.5, 0.5, 0.5)
						.translateTo(-500, -300, 0)
						.mount(self.backScene);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }