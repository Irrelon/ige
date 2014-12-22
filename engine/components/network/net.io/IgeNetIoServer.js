var IgeNetIoServer = {
	_idCounter: 0,
	_requests: {},

	/**
	 * Starts the network for the server.
	 * @param {*} data The port to listen on.
	 * @param {Function=} callback A callback method to call once the
	 * network has started.
	 */
	start: function (data, callback) {
		var self = this;

		this._socketById = {};

		if (typeof(data) !== 'undefined') {
			this._port = data;
		}

		// Start net.io
		this.log('Starting net.io listener on port ' + this._port);
		this._io = new this._netio(this._port, callback);

		// Setup listeners
		this._io.on('connection', function () { self._onClientConnect.apply(self, arguments); });

		// Setup default commands
		this.define('_igeRequest', function () { self._onRequest.apply(self, arguments); });
		this.define('_igeResponse', function () { self._onResponse.apply(self, arguments); });
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
	 * Returns an object with each key being the ID of
	 * a connected client and each value being the socket
	 * that is related to that client.
	 * @return {Object}
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

	/**
	 * Sends a message over the network.
	 * @param {String} commandName
	 * @param {Object} data
	 * @param {*=} clientId If specified, sets the recipient socket id or a array of socket ids to send to.
	 */
	send: function (commandName, data, clientId) {
		var commandIndex = this._networkCommandsLookup[commandName],
			ciEncoded;

		if (commandIndex !== undefined) {
			ciEncoded = String.fromCharCode(commandIndex);
			this._io.send([ciEncoded, data], clientId);
		} else {
			this.log('Cannot send network packet with command "' + commandName + '" because the command has not been defined!', 'error');
		}
	},

	/**
	 * Sends a network request. This is different from a standard
	 * call to send() because the recipient code will be able to
	 * respond by calling ige.network.response(). When the response
	 * is received, the callback method that was passed in the
	 * callback parameter will be fired with the response data.
	 * @param {String} commandName
	 * @param {Object} data
	 * @param {Function} callback
	 */
	request: function (commandName, data, callback) {
		// Build the request object
		var req = {
			id: this.newIdHex(),
			cmd: commandName,
			data: data,
			callback: callback,
			timestamp: new Date().getTime()
		};

		// Store the request object
		this._requests[req.id] = req;

		// Send the network request packet
		this.send(
			'_igeRequest',
			{
				id: req.id,
				cmd: commandName,
				data: req.data
			}
		);
	},

	/**
	 * Sends a response to a network request.
	 * @param {String} requestId
	 * @param {Object} data
	 */
	response: function (requestId, data) {
		// Grab the original request object
		var req = this._requests[requestId];

		if (req) {
			// Send the network response packet
			this.send(
				'_igeResponse',
				{
					id: requestId,
					cmd: req.commandName,
					data: data
				},
				req.clientId
			);

			// Remove the request as we've now responded!
			delete this._requests[requestId];
		}
	},

	/**
	 * Generates a new 16-character hexadecimal unique ID
	 * @return {String}
	 */
	newIdHex: function () {
		this._idCounter++;
		return (this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17))).toString(16);
	},

	/**
	 * Determines if the origin of a request should be allowed or denied.
	 * @param origin
	 * @return {Boolean}
	 * @private
	 */
	_originIsAllowed: function (origin) {
		// put logic here to detect whether the specified origin is allowed.
		return true;
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
			// Check if any listener cancels this
			if (!this.emit('connect', socket)) {
				this.log('Accepted connection with id ' + socket.id);
				this._socketById[socket.id] = socket;

				socket.on('message', function (data) {
					self._onClientMessage.apply(self, [data, socket.id]);
				});

				socket.on('disconnect', function (data) {
					self._onClientDisconnect.apply(self, [data, socket]);
				});

				// Send an init message to the client
				socket.send({
					cmd: 'init',
					ncmds: this._networkCommandsLookup,
					ts: ige._timeScale,
					ct: ige._currentTime
				});

				// Send a clock sync command
				this._sendTimeSync(undefined, socket.id);
			} else {
				// Reject the connection
				socket.close();
			}
		} else {
			this.log('Rejecting connection with id ' + socket.id + ' - we are not accepting connections at the moment!');
			socket.close();
		}
	},

	/**
	 * Called when the server receives a network message from a client.
	 * @param {Object} data The data sent by the client.
	 * @param {String} clientId The client socket id.
	 * @private
	 */
	_onClientMessage: function (data, clientId) {
		var ciDecoded = data[0].charCodeAt(0),
			commandName = this._networkCommandsIndex[ciDecoded];

		if (this._networkCommands[commandName]) {
			this._networkCommands[commandName](data[1], clientId);
		}

		this.emit(commandName, [data[1], clientId]);
	},
	
	_onRequest: function (data, clientId) {
		// The message is a network request so fire
		// the command event with the request id and
		// the request data
		data.clientId = clientId;
		this._requests[data.id] = data;

		if (this.debug()) {
			console.log('onRequest', data);
			console.log('emitting', data.cmd, [data.id, data.data]);
			this._debugCounter++;
		}

		if (this._networkCommands[data.cmd]) {
			this._networkCommands[data.cmd](data.data, clientId, data.id);
		}

		this.emit(data.cmd, [data.id, data.data, clientId]);
	},

	_onResponse: function (data, clientId) {
		// The message is a network response
		// to a request we sent earlier
		id = data.id;

		// Get the original request object from
		// the request id
		req = this._requests[id];

		if (this.debug()) {
			console.log('onResponse', data);
			this._debugCounter++;
		}

		if (req) {
			// Fire the request callback!
			req.callback(req.cmd, [data.data, clientId]);

			// Delete the request from memory
			delete this._requests[id];
		}
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

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeNetIoServer; }