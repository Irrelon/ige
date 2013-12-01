/**
 * The client-side net.io component. Handles all client-side
 * networking systems.
 */
var IgeNetIoClient = {
	version: '1.0.0',
	_initDone: false,
	_idCounter: 0,
	_requests: {},
	_state: 0,

	/**
	 * Gets the current socket id.
	 * @returns {String} The id of the socket connection to the server.
	 */
	id: function () {
		return this._id || '';
	},
	
	/**
	 * Starts the network for the client.
	 * @param {*} url The game server URL.
	 * @param {Function=} callback A callback method to call once the
	 * network has started.
	 */
	start: function (url, callback) {
		if (this._state === 3) {
			// We're already connected
			if (typeof(callback) === 'function') {
				callback();
			}
		} else {
			var self = this;

			self._startCallback = callback;

			if (typeof(url) !== 'undefined') {
				this._url = url;
			}

			this.log('Connecting to net.io server at "' + this._url + '"...');

			if (typeof(WebSocket) !== 'undefined') {
				this._io = new NetIo.Client(url);
				self._state = 1; // Connecting

				// Define connect listener
				this._io.on('connect', function (clientId) {
					self._state = 2; // Connected
					self._id = clientId;
					self._onConnectToServer.apply(self, arguments);
				});

				// Define message listener
				this._io.on('message', function (data) {
					if (!self._initDone) {
						var i, commandCount = 0;

						// Check if the data is an init packet
						if (data.cmd === 'init') {
							// Set flag to show we've now received an init command
							self._initDone = true;
							self._state = 3; // Connected and init done

							// Setup the network commands storage
							self._networkCommandsLookup = data.ncmds;

							// Fill the reverse lookup on the commands
							for (i in self._networkCommandsLookup) {
								if (self._networkCommandsLookup.hasOwnProperty(i)) {
									self._networkCommandsIndex[self._networkCommandsLookup[i]] = i;
									commandCount++;
								}
							}

							// Setup default commands
							self.define('_igeRequest', function () { self._onRequest.apply(self, arguments); });
							self.define('_igeResponse', function () { self._onResponse.apply(self, arguments); });
							self.define('_igeNetTimeSync', function () { self._onTimeSync.apply(self, arguments); });

							self.log('Received network command list with count: ' + commandCount);

							// Setup time scale and current time
							ige.timeScale(parseFloat(data.ts));
							ige._currentTime = parseInt(data.ct);

							// Now fire the start() callback
							if (typeof(self._startCallback) === 'function') {
								self._startCallback();
								delete self._startCallback;
							}
						}
					} else {
						self._onMessageFromServer.apply(self, arguments);
					}
				});

				// Define disconnect listener
				this._io.on('disconnect', function () {
					self._state = 0; // Disconnected
					self._onDisconnectFromServer.apply(self, arguments);
				});

				// Define error listener
				this._io.on('error', function () {
					self._onError.apply(self, arguments);
				});
			}
		}
	},

	stop: function () {
		// Check we are connected
		if (self._state === 3) {
			this._io.disconnect('Client requested disconnect');
		}
	},

	/**
	 * Gets / sets a network command and callback. When a network command
	 * is received by the client, the callback set up for that command will
	 * automatically be called and passed the data from the incoming network
	 * packet.
	 * @param {String} commandName The name of the command to define.
	 * @param {Function} callback A function to call when the defined network
	 * command is received by the network.
	 * @return {*}
	 */
	define: function (commandName, callback) {
		if (commandName !== undefined && callback !== undefined) {
			// Check if this command has been defined by the server
			if (this._networkCommandsLookup[commandName] !== undefined) {
				this._networkCommands[commandName] = callback;
			} else {
				this.log('Cannot define network command "' + commandName + '" because it does not exist on the server. Please edit your server code and define the network command there before trying to define it on the client!', 'error');
			}

			return this._entity;
		} else {
			this.log('Cannot define network command either the commandName or callback parameters were undefined!', 'error');
		}
	},

	/**
	 * Sends a network message with the given command name
	 * and data.
	 * @param commandName
	 * @param data
	 */
	send: function (commandName, data) {
		var commandIndex = this._networkCommandsLookup[commandName],
			ciEncoded;

		if (commandIndex !== undefined) {
			if (this.debug()) {
				console.log('Sending "' + commandName + '" (index ' + commandIndex + ') with data:', data);
				this._debugCounter++;
			}
			ciEncoded = String.fromCharCode(commandIndex);
			this._io.send([ciEncoded, data]);
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
				}
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

	_onRequest: function (data) {
		// The message is a network request so fire
		// the command event with the request id and
		// the request data
		this._requests[data.id] = data;

		if (this.debug()) {
			console.log('onRequest', data);
			this._debugCounter++;
		}

		if (this._networkCommands[data.cmd]) {
			this._networkCommands[data.cmd](data.id, data.data);
		}

		this.emit(data.cmd, [data.id, data.data]);
	},

	_onResponse: function (data) {
		var id,
			req;
		
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
			req.callback(req.cmd, data.data);

			// Delete the request from memory
			delete this._requests[id];
		}
	},

	/**
	 * Called when the network connects to the server.
	 * @private
	 */
	_onConnectToServer: function () {
		this.log('Connected to server!');
		this.emit('connected');
	},

	/**
	 * Called when data from the server is received on the client.
	 * @param data
	 * @private
	 */
	_onMessageFromServer: function (data) {
		var ciDecoded = data[0].charCodeAt(0),
			commandName = this._networkCommandsIndex[ciDecoded];

		if (this._networkCommands[commandName]) {
			if (this.debug()) {
				console.log('Received "' + commandName + '" (index ' + ciDecoded + ') with data:', data[1]);
				this._debugCounter++;
			}

			this._networkCommands[commandName](data[1]);
		}

		this.emit(commandName, data[1]);
	},

	/**
	 * Called when the client is disconnected from the server.
	 * @param data
	 * @private
	 */
	_onDisconnectFromServer: function (data) {
		if (data === 'booted') {
			this.log('Server rejected our connection because it is not accepting connections at this time!', 'warning');
		} else {
			this.log('Disconnected from server!');
		}
		this.emit('disconnected');
	},

	/**
	 * Called when the client has an error with the connection.
	 * @param {Object} data
	 * @private
	 */
	_onError: function (data) {
		this.log('Error with connection: ' + data.reason, 'error');
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeNetIoClient; }