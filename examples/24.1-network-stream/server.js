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
			// Start the network server
			.network.start(2000, function () {
				// Networking has started so start the game engine
				ige.start(function (success) {
					// Check if the engine started successfully
					if (success) {
						// Add the network stream component
						ige.network.addComponent(IgeStreamComponent)
							.stream.sendInterval(120) // Send a stream update once every 30 milliseconds
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
						self.obj[0] = new Rotator(0)
							.id('fairy0')
							.depth(1)
							.translateTo(0, 0, 0)
							.streamMode(1)
							//.streamSyncInterval(200)
							.mount(self.scene1);

						// Add a value to the custom property that the
						// rotator class "custom1" stream section will
						// stream to clients
						self.obj[0]._customProperty = 'Hello';

						// Create a second rotator entity and mount
						// it to the first one at 0, 50 relative to the
						// parent
						self.obj[1] = new Rotator2(0.1)
							.id('fairy1')
							.depth(1)
							.translateTo(0, 50, 0)
							.streamMode(1)
							.mount(self.obj[0]);

						// Create a third rotator entity that will only
						// "live" for 10 seconds - helps to test the stream
						// based entity destruction system
						self.obj[2] = new Rotator2(0.1)
							.id('fairy2')
							.depth(1)
							.translateTo(0, 150, 0)
							.streamMode(1)
							.lifeSpan(8000) // NOTE THIS ENTITY LIFESPAN MEANS IT WILL BE DESTROYED IN 10 SECONDS :)
							.mount(self.scene1);

						// Create an entity and mount it to the scene
						self.obj[3] = new Mover()
							.id('mover0')
							.depth(1)
							.translateTo(-300, -100, 0)
							.streamMode(1)
							.mount(self.scene1);

						self.obj[4] = new Mover()
							.id('mover1')
							.depth(1)
							.translateTo(300, 100, 0)
							.streamMode(1)
							.mount(self.scene1);
					}
				});
			});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }