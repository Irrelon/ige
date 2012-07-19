var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function () {
		// Add the server-side game methods
		this.implement(ServerNetworkEvents);

		// Start the network server
		ige.addComponent(IgeSocketIoComponent)
			.network.define('placeItem', this._placeItem)
			.network.start(2000);

		// Start the game engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Accept incoming connections
				ige.network.acceptConnections(true);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }