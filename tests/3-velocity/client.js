var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [],
			tempObj;

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d();

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					self.obj[0] = tempObj = new IgeEntity()
						.addComponent(IgeVelocityComponent)
						.velocity.x(-0.01)
						.velocity.y(0.01)
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.mount(self.scene1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }