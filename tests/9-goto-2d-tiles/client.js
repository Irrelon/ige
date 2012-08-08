var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this;
		this.obj = [];

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Start the engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Create the scene
				self.scene1 = new IgeScene2d();

				// Create the main viewport
				self.vp1 = new IgeViewport()
					.id('vp1')
					.autoSize(true)
					.scene(self.scene1)
					.drawMouse(true)
					.mount(ige);

				// Create an isometric tile map
				self.tileMap1 = new IgeTileMap2d()
					.id('tileMap1')
					.tileWidth(40)
					.tileHeight(40)
					.drawGrid(3)
					.drawMouse(true)
					.mount(self.scene1);

				self.player = new Character()
					.id('player')
					.addComponent(PlayerComponent)
					.setType(3)
					.mount(self.tileMap1);

				// Set the camera to track the character with some
				// tracking smoothing turned on (100)
				self.vp1.camera.trackTranslate(self.player, 100);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }