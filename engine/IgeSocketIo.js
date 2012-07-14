var IgeSocketIoComponent = IgeClass.extend({
	classId: 'IgeSocketIoComponent',
	componentId: 'network',

	init: function () {
		// Set some defaults
		this._port = 8000;
		/* CEXCLUDE */
		if (ige.isServer) {
			this._socketio = require(modulePath + 'socket.io');
			this._acceptConnections = false;
		}
		/* CEXCLUDE */
	},

	start: function (port) {
		var self = this;

		if (typeof(port) !== 'undefined') {
			this._port = port;
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

			this._io = io.connect(port);
			this._io.on('connect', function (data) {
				self.log('Connected to server!');
			});

			this._io.on('disconnect', function (data) {
				if (data === 'booted') {
					self.log('Server rejected our connection because it is not accepting connections at this time!', 'warning');
				} else {
					self.log('Disconnected from server!');
				}
			});
		}
	},

	acceptConnections: function (val) {
		if (typeof(val) !== 'undefined') {
			this._acceptConnections = val;
			if (val) {
				this.log('Server now accepting connections!');
			} else {
				this.log('Server no longer accepting connections!');
			}
		}

		return this._acceptConnections;
	},

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
		} else {
			this.log('Rejecting connection with id ' + socket.id + ' - we are not accepting connections at the moment!');
			socket.disconnect();
		}
	},

	_onClientMessage: function (data, socket) {

	},

	_onClientDisconnect: function (data, socket) {
		this.log('Client disconnected with id ' + socket.id);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSocketIo; }