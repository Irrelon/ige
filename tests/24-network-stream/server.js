var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this;

		this.obj = [];

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
						// Add the network stream component
						ige.network.addComponent(IgeStreamComponent)
							.stream.sendInterval(30) // Send a stream update once every 30 milliseconds
							.stream.start(); // Start the stream

						// Accept incoming network connections
						ige.network.acceptConnections(true);

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

						// Create an entity and mount it to the scene
						self.obj[0] = new Rotator()
							.id('fairy1')
							.depth(1)
							.translateTo(0, 0, 0)
							.streamMode(1)
							.mount(self.scene1);

						// Create a second rotator entity and mount
						// it to the first one at 0, 50 relative to the
						// parent
						self.obj[1] = new Rotator2()
							.id('fairy2')
							.depth(1)
							.translateTo(0, 50, 0)
							.streamMode(1)
							.mount(self.obj[0]);
					}
				});
			});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }