var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		// Load our textures
		var self = this;

		this.obj = [];
		this.gameTexture = {};

		// Use the networking component
		ige.addComponent(IgeNetIoComponent);

		// Implement the client stuff
		this.implement(ClientSplash);
		this.implement(ClientLobby);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Ask the engine to start
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene that the main game items
					// will reside on
					self.mainScene = new IgeScene2d()
						.id('mainScene');

					// Create the main viewport and tell it to "look"
					// at gameScene with auto-sizing enabled to fill the
					// browser window
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.mainScene)
						.drawBounds(false) // Switch this to true to draw all bounding boxes
						.drawBoundsData(true) // Switch to true (and flag above) to see bounds data
						.mount(ige);

					// Show the splash screen
					self.createSplash();

					// Setup a new listener for lobby loaded
					ige.on('texturesLoaded', function () {
						self.destroySplash();
						self.createLobby();
					});

					// Load our main game textures etc
					self.loadLobby();
				}
			});
		}, false, true);

		this.loadSplash();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }