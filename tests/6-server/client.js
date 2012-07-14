var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					self.scene1 = new IgeScene2d();

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.scene(self.scene1)
						.mount(ige);

					self.obj[0] = new IgeEntity()
						.depth(1)
						.width(100)
						.height(100)
						.translateTo(-80, 0, 0)
						.texture(gameTexture[0])
						.mount(self.scene1);

					self.obj[1] = new IgeEntity()
						.depth(0)
						.width(100)
						.height(100)
						.translateTo(80, 0, 0)
						.texture(gameTexture[0])
						.mount(self.scene1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }