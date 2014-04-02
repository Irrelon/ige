var ServerNetworkEvents = {
	/**
	 * Is called when a network packet with the "test" command
	 * is received by the server from a client.
	 * @param data The data object that contains any data sent from the client.
	 * @param clientId The client object of the client that sent the message.
	 * @private
	 */
	_onTest: function (data, clientId) {
		console.log('Client test command received from client id "' + clientId + '" with data:', data);
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ServerNetworkEvents; }