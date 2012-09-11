var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this;

		// Add the server-side game methods / event handlers
		this.implement(ServerNetworkEvents);

		// Add the networking component
		ige.addComponent(IgeSocketIoComponent);
		ige.addComponent(IgeChatComponent);
			// Define a network command
		ige.network.define('test', self._onTest)
			// Start the network server
			.network.start(2000, function () {
				// Networking has started so start the game engine
				ige.start(function (success) {
					// Check if the engine started successfully
					if (success) {
						// Accept incoming network connections
						ige.network.acceptConnections(true);

						// Create a new chat room
						ige.chat.createRoom('The Lobby', {}, 'lobby');
					}
				});
			});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }