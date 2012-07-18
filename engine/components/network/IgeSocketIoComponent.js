var IgeSocketIoComponent = IgeEventingClass.extend({
	classId: 'IgeSocketIoComponent',
	componentId: 'network',

	init: function () {
		// Set some defaults
		this._port = 8000;
		/* CEXCLUDE */
		if (ige.isServer) {
			this.implement(IgeSocketIoServer);
			this._socketio = require('../../' + modulePath + 'socket.io');
			this._acceptConnections = false;
		}
		/* CEXCLUDE */

		if (!ige.isServer) {
			this.implement(IgeSocketIoClient);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSocketIoComponent; }