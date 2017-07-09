var ServerNetworkEvents = {
	/**
	 * Is called when the network tells us a new client has connected
	 * to the server. This is the point we can return true to reject
	 * the client connection if we wanted to.
	 * @param data The data object that contains any data sent from the client.
	 * @param clientId The client id of the client that sent the message.
	 * @private
	 */
	_onPlayerConnect: function (socket) {
		// Don't reject the client connection
		return false;
	},

	_onPlayerDisconnect: function (clientId) {
		if (ige.server.players[clientId]) {
			// Remove the player from the game
			ige.server.players[clientId].destroy();

			// Remove the reference to the player entity
			// so that we don't leak memory
			delete ige.server.players[clientId];
		}
	},

	_onPlayerEntity: function (data, clientId) {
		if (!ige.server.players[clientId]) {
			ige.server.players[clientId] = new CharacterContainer(clientId)
				.addComponent(PlayerComponent)
				.streamMode(1)
				.mount(ige.server.foregroundMap);

			// Tell the client to track their player entity
			ige.network.send('playerEntity', ige.server.players[clientId].id(), clientId);
		}
	},

	_onPlayerControlToTile: function (data, clientId) {
		var playerEntity = ige.server.players[clientId],
			newPath,
			currentPosition = playerEntity._translate,
			startTile;

		console.log('Path to: ', data);
		
		startTile = playerEntity._parent.pointToTile(currentPosition.toIso());
		console.log('startTile', startTile);
				
		// Start movement along the new path
		playerEntity.path
			.clear()
			.add(parseInt(data[0]), parseInt(data[1]), 0)
			.start();
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ServerNetworkEvents; }