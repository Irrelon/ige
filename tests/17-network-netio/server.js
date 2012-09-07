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
					}
				});
			});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }