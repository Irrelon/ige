var ServerNetworkEvents = {
	/**
	 * Is called when a network packet with the "test" command
	 * is received by the server from a client.
	 * @param data The data object that contains any data sent from the client.
	 * @param clientId The client id of the client that sent the message.
	 * @private
	 */
	_onTest: function (data, clientId) {
		console.log('Client test command received from client id "' + clientId + '" with data:', data);
		console.log('Sending back to client!');
		ige.network.send('test', {moo:'here\'s some data right back at ya!'}, clientId);
	},

	_onTestRequest: function (data, clientId, requestId) {
		console.log('Client testRequest command received from client id "' + clientId + '" with data:', data);
		ige.network.response(requestId, {serverSaid:'moo!'});
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ServerNetworkEvents; }