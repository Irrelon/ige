var IgeSocketIoServer = {
	/**
	 * Starts the network for the server.
	 * @param {*} data The port to listen on.
	 * @param {Function=} callback A callback method to call once the
	 * network has started.
	 */
	start: function (data, callback) {
		var self = this;

		this._socketById = [];

		if (typeof(data) !== 'undefined') {
			this._port = data;
		}

		// Start socket.io
		this.log('Starting socket.io listener on port ' + this._port);
		this._io = this._socketio.listen(this._port);

		// Set the logging level to errors only
		this._io.set('log level', 0);

		// Setup listeners
		this._io.sockets.on('connection', function (socket) {
			self._onClientConnect(socket);
		});

		if (typeof(callback) === 'function') {
			callback();
		}

		// Set some default commands
		this.define('_igeNetTimeSync', function () { self._onTimeSync.apply(self, arguments); });

		// Start network sync
		this.timeSyncStart();

		return this._entity;
	},

	/**
	 * Sets a network command and optional callback. When a network command
	 * is received by the server, the callback set up for that command will
	 * automatically be called and passed the data from the incoming network
	 * packet.
	 * @param {String} commandName The name of the command to define.
	 * @param {Function=} callback A function to call when the defined network
	 * command is received by the network.
	 * @return {*}
	 */
	define: function (commandName, callback) {
		if (commandName !== undefined) {
			this._networkCommands[commandName] = callback;

			// Record reverse lookups
			var index = this._networkCommandsIndex.length;
			this._networkCommandsIndex[index] = commandName;
			this._networkCommandsLookup[commandName] = index;

			return this._entity;
		} else {
			this.log('Cannot define a network command without a commandName parameter!', 'error');
		}
	},

	/**
	 * Returns an associative array of all connected clients
	 * by their ID.
	 * @return {Array}
	 */
	clients: function () {
		return this._socketById;
	},

	/**
	 * Returns the socket associated with the specified client id.
	 * @param {String=} clientId
	 * @return {*}
	 */
	socket: function (clientId) {
		return this._socketById[clientId];
	},

	/**
	 * Gets / sets the current flag that determines if client connections
	 * should be allowed to connect (true) or dropped instantly (false).
	 * @param {Boolean} val Set to true to allow connections or false
	 * to drop any incoming connections.
	 * @return {*}
	 */
	acceptConnections: function (val) {
		if (typeof(val) !== 'undefined') {
			this._acceptConnections = val;
			if (val) {
				this.log('Server now accepting connections!');
			} else {
				this.log('Server no longer accepting connections!');
			}

			return this._entity;
		}

		return this._acceptConnections;
	},

	send: function (commandName, data, clientId) {
		var commandIndex = this._networkCommandsLookup[commandName],
			arrCount;

		if (commandIndex !== undefined) {
			if (clientId) {
				if (typeof(clientId) === 'object') {
					// The clientId is an array, loop it and send to each client
					arrCount = clientId.length;
					while (arrCount--) {
						this._socketById[clientId[arrCount]].json.send([commandIndex, data]);
					}
				} else {
					// The clientId is a string, send to individual client
					this._socketById[clientId].json.send([commandIndex, data]);
				}
			} else {
				this._io.sockets.json.send([commandIndex, data]);
			}
		} else {
			this.log('Cannot send network packet with command "' + commandName + '" because the command has not been defined!', 'error');
		}
	},

	/**
	 * Called when the server receives a client connection request. Sets
	 * up event listeners on the socket and sends the client the initial
	 * networking data required to allow network commands to operate
	 * correctly over the connection.
	 * @param {Object} socket The client socket object.
	 * @private
	 */
	_onClientConnect: function (socket) {
		var self = this;

		if (this._acceptConnections) {
			if (!this.emit('connect', socket)) {
				this.log('Accepted connection with id ' + socket.id);
				this._socketById[socket.id] = socket;

				socket.on('message', function (data) {
					self._onClientMessage(data, socket.id);
				});

				socket.on('disconnect', function (data) {
					self._onClientDisconnect(data, socket);
				});

				// Send an init message to the client
				socket.json.send({
					cmd: 'init',
					ncmds: this._networkCommandsLookup
				});
			} else {
				// Reject the connection
				socket.disconnect();
			}
		} else {
			this.log('Rejecting connection with id ' + socket.id + ' - we are not accepting connections at the moment!');
			socket.disconnect();
		}
	},

	/**
	 * Called when the server receives a network message from a client.
	 * @param {Object} data The data sent by the client.
	 * @param {Object} socket The client socket object.
	 * @private
	 */
	_onClientMessage: function (data, socket) {
		var commandName = this._networkCommandsIndex[data[0]];
		if (this._networkCommands[commandName]) {
			this._networkCommands[commandName](data[1], socket);
		}
		this.emit(commandName, data[1], socket);
	},

	/**
	 * Called when a client disconnects from the server.
	 * @param {Object} data Any data sent along with the disconnect.
	 * @param {Object} socket The client socket object.
	 * @private
	 */
	_onClientDisconnect: function (data, socket) {
		this.log('Client disconnected with id ' + socket.id);
		this.emit('disconnect', socket.id);

		delete this._socketById[socket.id];
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSocketIoServer; }