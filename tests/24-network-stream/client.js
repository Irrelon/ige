var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		// Load our textures
		var self = this;

		// Enable networking
		ige.addComponent(IgeNetIoComponent);

		// Implement our game methods
		this.implement(ClientNetworkEvents);

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Ask the engine to start
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Start the networking (you can do this elsewhere if it
				// makes sense to connect to the server later on rather
				// than before the scene etc are created... maybe you want
				// a splash screen or a menu first? Then connect after you've
				// got a username or something?
				ige.network.start('http://localhost:2000', function () {
					ige.network.addComponent(IgeStreamComponent)
						.stream.renderLatency(160); // Render the simulation 160 milliseconds in the past

					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1');

					// Create the main viewport and set the scene
					// it will "look" at as the new scene1 we just
					// created above
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);
				});
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }