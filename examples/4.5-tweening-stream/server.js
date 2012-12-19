var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this,
			i;

		this.obj = [];

		// Start the network server
		ige.addComponent(IgeNetIoComponent);
		ige.network.start(2000);

		// Start the game engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Add the network stream component
				ige.network.addComponent(IgeStreamComponent)
					.stream.sendInterval(120) // Send a stream update once every 30 milliseconds
					.stream.start(); // Start the stream

				// Accept incoming connections
				ige.network.acceptConnections(true);

				// Create the scene
				self.scene1 = new IgeScene2d()
					.id('scene1');

				// Create the main viewport
				self.vp1 = new IgeViewport()
					.id('vp1')
					.autoSize(true)
					.scene(self.scene1)
					.drawBounds(true)
					.drawBoundsData(true)
					.mount(ige);

				// Create 100 random tweening entities and add
				// mouse over and mouse out event listeners to
				// them based on the functions we defined above,
				// then add them to the scene!
				for (i = 0; i < 100; i++) {
					self.obj[i] = new RandomTweener()
						.id('fairy' + i)
						.depth(i)
						.width(100)
						.height(100)
						.translateTo(0, 0, 0)
						.streamMode(1)
						.mount(self.scene1);
				}
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }