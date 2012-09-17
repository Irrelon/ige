var IgeSocketIoComponent = IgeEventingClass.extend([
	{extension: IgeTimeSyncExtension, overwrite: false}
], {
	classId: 'IgeSocketIoComponent',
	componentId: 'network',

	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		// Setup the network commands storage
		this._networkCommands = {};
		this._networkCommandsIndex = [];
		this._networkCommandsLookup = {};

		// Set some defaults
		this._port = 8000;

		// Time sync defaults
		this._timeSyncInterval = 10000; // Sync the client/server clocks every ten seconds by default
		this._timeSyncLog = {};

		/* CEXCLUDE */
		if (ige.isServer) {
			this.implement(IgeSocketIoServer);
			this._socketio = require('../../../' + modulePath + 'socket.io');
			this._acceptConnections = false;
		}
		/* CEXCLUDE */

		if (!ige.isServer) {
			this.implement(IgeSocketIoClient);
		}

		this.log('Network component initiated!');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSocketIoComponent; }