var ClientNetworkEvents = {
	/**
	 * Is called when a network packet with the "test" command
	 * is received by the client from the server.
	 * @param data The data object that contains any data sent from the server.
	 * @private
	 */
	_onTest: function (data) {
		console.log('Test command received from server with data:', data);
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ClientNetworkEvents; }