var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		ige.input.debug(true);

		// Load the fairy texture and store it in the gameTexture array
		gameTexture[0] = new IgeTexture('../assets/textures/backgrounds/grassTile.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			gameTexture[0].resize(100, 50);

			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create a parent scene node
					self.mainScene = new IgeScene2d()
						.id('mainScene');

					// Create a background scene node and apply
					// a background pattern to it using an isometric
					// tile so we set the 4th argument to true. If
					// using a 2d tile, we would set it to false.
					// The 3rd argument true means that as we pan
					// around the viewport with the mouse, the pattern
					// will "track" the camera as if it was the "floor".
					self.backgroundScene = new IgeScene2d()
						.id('backgroundScene')
						.backgroundPattern(gameTexture[0], 'repeat', true, true)
						.ignoreCamera(true) // We want the scene to remain static
						.mount(self.mainScene);

					// Create the main viewport and set the scene
					// it will "look" at as the new scene1 we just
					// created above
					self.vp1 = new IgeViewport()
						.addComponent(IgeMousePanComponent)
						.addComponent(IgeMouseZoomComponent)
						.mousePan.enabled(true)
						.id('vp1')
						.autoSize(true)
						.scene(self.mainScene)
						.drawBounds(true)
						.mount(ige);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }