var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this;

		// Add the server-side game methods / event handlers
		this.implement(ServerNetworkEvents);

		// Add the networking component
		ige.addComponent(IgeNetIoComponent)
			// Define a network command
			.network.define('test', self._onTest)
			.network.define('testRequest', self._onTestRequest)
			// Start the network server
			.network.start(2000, function () {
				// Networking has started so start the game engine
				ige.start(function (success) {
					// Check if the engine started successfully
					if (success) {
						// Accept incoming network connections
						ige.network.acceptConnections(true);

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
						self.obj = new Rotator()
							.id('fairy1')
							.depth(1)
							.width(100)
							.height(100)
							.translateTo(0, 0, 0)
							.streamMode(1)
							.mount(self.scene1);
					}
				});
			});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }