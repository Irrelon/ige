var IgeSocketIoServer = {
	/**
	 * Starts the network for the server.
	 * @param {*} data The port to listen on.
	 * @param {Function=} callback A callback method to call once the
	 * network has started.
	 */
	start: function (data, callback) {
		var self = this;

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
			this.log('Accepted connection with id ' + socket.id);

			socket.on('message', function (data) {
				self._onClientMessage(data, socket);
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

	},

	/**
	 * Called when a client disconnects from the server.
	 * @param {Object} data Any data sent along with the disconnect.
	 * @param {Object} socket The client socket object.
	 * @private
	 */
	_onClientDisconnect: function (data, socket) {
		this.log('Client disconnected with id ' + socket.id);
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSocketIoServer; }