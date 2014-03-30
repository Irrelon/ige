var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this;

        // add database component
        ige.addComponent(IgeMySqlComponent, options.db);

        // Add the server-side game methods / event handlers
        this.implement(ServerNetworkEvents);

		// Add the networking component
		ige.addComponent(IgeNetIoComponent)
            .network.define('onDbTest', self._onDbTest)
			// Start the network server
			.network.start(2000, function () {
				// Networking has started so start the game engine
				ige.start(function (success) {
					// Check if the engine started successfully
					if (success) {
						ige.network.on('connect', function () {});
						ige.network.on('disconnect', function () {});

//                        ige.;

						// Add the network stream component
//						ige.network.addComponent(IgeStreamComponent)
//							.stream.sendInterval(30) // Send a stream update once every 30 milliseconds
//							.stream.start(); // Start the stream

						// Accept incoming network connections
						ige.network.acceptConnections(true);

						// Load the base scene data
//						ige.addGraph('IgeBaseScene');
					}
				});
			});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }