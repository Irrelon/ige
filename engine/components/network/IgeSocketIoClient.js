/**
 * The client-side socket.io component. Handles all client-side
 * networking systems.
 */
var IgeSocketIoClient = {
	_initDone: false,

	/**
	 * Starts the network for the client.
	 * @param {*} data The game server URL.
	 * @param {Function=} callback A callback method to call once the
	 * network has started.
	 */
	start: function (data, callback) {
		var self = this;
		self._startCallback = callback;

		if (typeof(data) !== 'undefined') {
			this._port = data;
		}

		this.log('Connecting to socket.io server at "' + this._port + '"...');

		this._io = io.connect(data);

		// Define connect listener
		this._io.on('connect', function () {
			self._onConnectToServer.apply(self, arguments);
		});

		// Define message listener
		this._io.on('message', function (data) {
			if (!self._initDone) {
				var i;

				// Check if the data is an init packet
				if (data.cmd === 'init') {
					// Set flag to show we've now received an init command
					self._initDone = true;

					// Setup the network commands storage
					self._networkCommandsLookup = data.ncmds;

					// Fill the reverse lookup on the commands
					for (i in self._networkCommandsLookup) {
						if (self._networkCommandsLookup.hasOwnProperty(i)) {
							self._networkCommandsIndex[self._networkCommandsLookup[i]] = i;
						}
					}

					// Now fire the start() callback
					if (typeof(self._startCallback) === 'function') {
						self._startCallback();
						delete self._startCallback;
					}
				}
			}

			self._onMessageFromServer.apply(self, arguments);
		});

		// Define disconnect listener
		this._io.on('disconnect', function () {
			self._onDisconnectFromServer.apply(self, arguments);
		});
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
				this.log('Cannot define network command because it does not exist on the server. Please edit your server code and define the network command there before trying to define it on the client!', 'error');
			}

			return this._entity;
		} else {
			this.log('Cannot define network command either the commandName or callback parameters were undefined!', 'error');
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
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSocketIoClient; }