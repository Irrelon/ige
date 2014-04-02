var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this;

		// Add the server-side game methods / event handlers
		this.implement(ServerNetworkEvents);

		// Connect to the mongo database
		ige.addComponent(IgeMongoDbComponent, options.db).mongo.connect(function (err, db) {
			// Check if we connected to mongodb correctly
			if (!err) {
				// Start the network server
				ige.addComponent(IgeSocketIoComponent)
					.network.define('login', self._login)
					.network.define('getMap', self._getMap)
					.network.define('placeItem', self._placeItem)
					.network.define('removeItem', self._removeItem)
					.network.start(2000);

				// Start the game engine
				ige.start(function (success) {
					// Check if the engine started successfully
					if (success) {
						// Accept incoming network connections
						ige.network.acceptConnections(true);
					}
				});
			} else {
				self.log('Cannot start server because we could not connect to the database server!', 'error');
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }