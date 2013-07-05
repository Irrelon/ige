var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		// Start the network server
		ige.addComponent(IgeSocketIoComponent);
		ige.network.start();
		
		
		// Start the game engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Add the network stream component
				ige.network.addComponent(IgeStreamComponent)
					.stream.sendInterval(100) // Send a stream update once every 100 milliseconds
					.stream.start(); // Start the stream
				
				// Create the base scene objects
				new Scene();
				
				// Start the casino class
				new Casino();
		
				// Accept incoming connections
				ige.network.acceptConnections(true);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }