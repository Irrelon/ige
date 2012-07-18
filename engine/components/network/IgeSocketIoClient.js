/**
 * The client-side socket.io component. Handles all client-side
 * networking systems.
 * @constructor
 */
var IgeSocketIoClient = function () {};

/**
 * Starts the network for either client or server.
 * @param {*} data If on server, specifies the port to start on, if on client, specifies the game server URL.
 */
IgeSocketIoClient.prototype.start = function (data) {
	var self = this;

	if (typeof(data) !== 'undefined') {
		this._port = data;
	}

	this.log('Connecting to socket.io server at "' + this._port + '"...');

	this._io = io.connect(data);

	this._io.on('connect', function () {
		self._onConnectToServer.apply(self, arguments);
	});

	this._io.on('message', function () {
		self._onMessageFromServer.apply(self, arguments);
	});

	this._io.on('disconnect', function () {
		self._onDisconnectFromServer.apply(self, arguments);
	});
};

/**
 * Called when the network connects to the server.
 * @param socket
 * @private
 */
IgeSocketIoClient.prototype._onConnectToServer = function () {
	this.log('Connected to server!');
	this.emit('connected');
};

/**
 * Called when data from the server is received on the client.
 * @param data
 * @private
 */
IgeSocketIoClient.prototype._onMessageFromServer = function (data) {
	console.log(data);
};

/**
 * Called when the client is disconnected from the server.
 * @param data
 * @private
 */
IgeSocketIoClient.prototype._onDisconnectFromServer = function (data) {
	if (data === 'booted') {
		this.log('Server rejected our connection because it is not accepting connections at this time!', 'warning');
	} else {
		this.log('Disconnected from server!');
	}
	this.emit('disconnected');
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSocketIoClient; }