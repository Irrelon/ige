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

				self.player = new Character()
					.addComponent(PlayerComponent)
					.setType(3)
					.mount(self.scene1);

				// Set the camera to track the character with some
				// tracking smoothing turned on (100)
				self.vp1.camera.trackTranslate(self.player, 100);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }