var IgeNetworkClient = IgeClass.extend({
	classId: 'IgeNetworkClient',

	init: function (socket) {
		this._socket = socket;
		this._id = socket.id;

		this._timeDiff = 0;
		this._streamDataCache = {};
		this._streamReady = false;
	},

	/**
	 * Disconnects this client and destroys the
	 * client object.
	 */
	disconnect: function () {
		this._socket.disconnect();
		this.destroy();
	},

	destroy: function () {
		delete this._socket;
		delete this._streamDataCache;
	}
});