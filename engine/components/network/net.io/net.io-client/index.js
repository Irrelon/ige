// Our namespace
var NetIo = {};

/**
 * Define the debug options object.
 * @type {Object}
 * @private
 */
NetIo._debug = {
	_enabled: true,
	_node: typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined',
	_level: ['log', 'warning', 'error'],
	_stacks: false,
	_throwErrors: true,
	_trace: {
		setup: false,
		enabled: false,
		match: ''
	},
	enabled: function (val) {
		if (val !== undefined) {
			this._enabled = val;
			return this;
		}

		return this._enabled;
	}
};

/**
 * Define the class system.
 * @type {*}
 */
NetIo.Class = IgeClass;

NetIo.EventingClass = IgeEventingClass;

NetIo.Client = NetIo.EventingClass.extend({
	classId: 'NetIo.Client',

	init: function (url, options) {
		this.log('Net.io client starting...');
		this._options = options || {};
		this._socket = null;
		this._state = 0;
		this._debug = false;
		this._connectionAttempts = 0;

		// Set some default options
		if (this._options.connectionRetry === undefined) { this._options.connectionRetry = true; }
		if (this._options.connectionRetryMax === undefined) { this._options.connectionRetryMax = 10; }
		if (this._options.reconnect === undefined) { this._options.reconnect = true; }

		// If we were passed a url, connect to it
		if (url !== undefined) {
			this.connect(url);
		}
	},

	/**
	 * Gets / sets the debug flag. If set to true, net.io
	 * will output debug data about every network event as
	 * it occurs to the console.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	debug: function (val) {
		if (val !== undefined) {
			this._debug = val;
			return this;
		}

		return this._debug;
	},

	connect: function (url) {
		this.log('Connecting to server at ' + url);
		var self = this;

		// Set the state to connecting
		this._state = 1;

		// Replace http:// with ws://
		url = url.replace('http://', 'ws://');

		// Create new websocket to the url
		this._socket = new WebSocket(url, 'netio1');

		// Setup event listeners
		this._socket.onopen = function () { self._onOpen.apply(self, arguments); };
		this._socket.onmessage = function () { self._onData.apply(self, arguments); };
		this._socket.onclose = function () { self._onClose.apply(self, arguments); };
		this._socket.onerror = function () { self._onError.apply(self, arguments); };
	},

	disconnect: function (reason) {
		this._socket.close(1000, reason);
	},

	send: function (data) {
		this._socket.send(this._encode(data));
	},

	_onOpen: function () {
		this._state = 2;
	},

	_onData: function (data) {
		// Decode packet and emit message event
		var packet = this._decode(data.data);

		// Output debug if required
		if (this._debug) {
			console.log('Incoming data (event, decoded data):', data, packet);
		}

		if (packet._netioCmd) {
			// The packet is a netio command
			switch (packet._netioCmd) {
				case 'id':
					// Store the new id in the socket
					this.id = packet.data;

					// Now we have an id, set the state to connected
					this._state = 3;

					// Emit the connect event
					this.emit('connect', this.id);
					break;

				case 'close':
					// The server told us our connection has been closed
					// so store the reason the server gave us!
					this._disconnectReason = packet.data;
					break;
			}
		} else {
			// The packet is normal data
			this.emit('message', [packet]);
		}
	},

	_onClose: function (code, reason, wasClean) {
		// If we are already connected and have an id...
		if (this._state === 3) {
			this._state = 0;
			this.emit('disconnect', {reason: this._disconnectReason, wasClean: wasClean, code:code});
		}

		// If we are connected but have no id...
		if (this._state === 2) {
			this._state = 0;
			this.emit('disconnect', {reason: this._disconnectReason, wasClean: wasClean, code:code});
		}

		// If we were trying to connect...
		if (this._state === 1) {
			this._state = 0;
			this.emit('error', {reason: 'Cannot establish connection, is server running?'});
		}

		// Remove the last disconnect reason
		delete this._disconnectReason;
	},

	_onError: function () {
		this.log('An error occurred with the net.io socket!', 'error', arguments);
		this.emit('error', arguments);
	},

	_encode: function (data) {
		return JSON.stringify(data);
	},

	_decode: function (data) {
		return JSON.parse(data);
	}
});