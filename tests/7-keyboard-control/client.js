var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this;
		this.obj = [];

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

				// Create a new character, add the player component
				// and then set the type (setType() is defined in
				// gameClasses/Character.js) so that the entity has
				// defined animation sequences to use.
				self.obj[0] = new Character()
					.addComponent(PlayerComponent)
					.setType(0)
					.mount(self.scene1);

				// Create a gold chest to use as a static reference point
				self.obj[1] = new Character()
					.addComponent(PlayerComponent)
					.setType(0)
					.mount(self.scene1);

				// Tell the camera to track our player character with some
				// tracking smoothing (set to 100)
				self.vp1.camera.trackTranslate(self.obj[0], 100);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }