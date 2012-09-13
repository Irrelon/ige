var IgeNetIoComponent = IgeEventingClass.extend([
	{extension: IgeTimeSyncExtension, overwrite: false}
], {
	classId: 'IgeNetIoComponent',
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
		this._debug = false;

		// Time sync defaults
		this._timeSyncInterval = 2000; // Sync the client/server clocks every ten seconds by default
		this._timeSyncLog = {};

		/* CEXCLUDE */
		if (ige.isServer) {
			this.implement(IgeNetIoServer);
			this._netio = require('../../../' + modulePath + 'net.io-server').Server;
			this._acceptConnections = false;
		}
		/* CEXCLUDE */

		if (!ige.isServer) {
			this.implement(IgeNetIoClient);
		}

		this.log('Network component initiated!');
	},

	/**
	 * Gets / sets debug flag that determines if debug output
	 * is logged to the console.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	debug: function (val) {
		if (val !== undefined) {
			this._debug = val;
			return this._entity;
		}

		return this._debug;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeNetIoComponent; }