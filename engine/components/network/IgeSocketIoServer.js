IgeSocketIoServer = function () {};

/**
 * Starts the network for either client or server.
 * @param {*} data If on server, specifies the port to start on, if on client, specifies the game server URL.
 */
IgeSocketIoServer.prototype.start = function (data) {
	var self = this;

	if (typeof(data) !== 'undefined') {
		this._port = data;
	}

	/* CEXCLUDE */
	if (ige.isServer) {
		// Start socket.io
		this.log('Starting socket.io listener on port ' + this._port);
		this._io = this._socketio.listen(this._port);

		// Set the logging level to errors only
		this._io.set('log level', 0);

		// Setup listeners
		this._io.sockets.on('connection', function (socket) {
			self._onClientConnect(socket);
		});
	}
	/* CEXCLUDE */

	if (!ige.isServer) {
		this.log('Connecting to socket.io server at "' + this._port + '"...');

		this._io = io.connect(data);
		this._io.on('connect', function (data) {
			self.log('Connected to server!');
			self.emit('connected');
		});

		this._io.on('disconnect', function (data) {
			if (data === 'booted') {
				self.log('Server rejected our connection because it is not accepting connections at this time!', 'warning');
			} else {
				self.log('Disconnected from server!');
			}
			self.emit('disconnected');
		});
	}
};

IgeSocketIoServer.prototype.acceptConnections = function (val) {
	if (typeof(val) !== 'undefined') {
		this._acceptConnections = val;
		if (val) {
			this.log('Server now accepting connections!');
		} else {
			this.log('Server no longer accepting connections!');
		}
	}

	return this._acceptConnections;
};

IgeSocketIoServer.prototype._onClientConnect = function (socket) {
	var self = this;

	if (this._acceptConnections) {
		this.log('Accepted connection with id ' + socket.id);

		socket.on('message', function (data) {
			self._onClientMessage(data, socket);
		});

		socket.on('disconnect', function (data) {
			self._onClientDisconnect(data, socket);
		});
	} else {
		this.log('Rejecting connection with id ' + socket.id + ' - we are not accepting connections at the moment!');
		socket.disconnect();
	}
};

IgeSocketIoServer.prototype._onClientMessage = function (data, socket) {

};

IgeSocketIoServer.prototype._onClientDisconnect = function (data, socket) {
	this.log('Client disconnected with id ' + socket.id);
};