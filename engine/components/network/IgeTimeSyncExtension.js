/**
 * Adds client/server time sync capabilities to the network system.
 * This handles calculating the time difference between the clock
 * on the server and the clock on connected clients.
 */
var IgeTimeSyncExtension = {
	/**
	 * Gets / sets the number of milliseconds between client/server
	 * clock sync events. The shorter the time, the more accurate the
	 * client simulation will be but the more network traffic you
	 * will transceive. Default value of ten seconds (10000) is usually
	 * enough to provide very accurate results without over-using the
	 * bandwidth.
	 * @param val
	 * @return {*}
	 */
	timeSyncInterval: function (val) {
		if (val !== undefined) {
			this._timeSyncInterval = val;
			return this._entity;
		}

		return this._timeSyncInterval;
	},

	/* CEXCLUDE */
	timeSyncStart: function () {
		if (ige.isServer) {
			// Send a time sync request
			this._sendTimeSync();

			var self = this;

			this.log('Starting client/server clock sync...');
			this._timeSyncTimer = setInterval(function () { self._sendTimeSync(); }, this._timeSyncInterval);
		}

		return this._entity;
	},

	_sendTimeSync: function (data, clientId) {
		if (!data) {
			data = new Date().getTime();
		}

		// Send the time sync command to all clients
		this.send('_igeNetTimeSync', data, clientId);
	},

	timeSyncStop: function () {
		this.log('Stopping client/server clock sync...');
		clearInterval(this._timeSyncTimer);

		return this._entity;
	},
	/* CEXCLUDE */

	_onTimeSync: function (data, clientId) {
		var localTime = new Date().getTime(),
			sendTime,
			roundTrip;

		if (!ige.isServer) {
			localTime = new Date().getTime();
			sendTime = parseInt(data, 10);

			this.log('Time sync, server->client transit time: ' + (localTime - sendTime) + 'ms, send timestamp: ' + sendTime + ', local timestamp: ' + localTime);

			// Send a response with out current clock time to the server
			this._sendTimeSync([data, localTime]);
		}

		if (ige.isServer) {
			sendTime = parseInt(data[1], 10);
			roundTrip = (localTime - parseInt(data[0], 10));

			this.log('Time sync, client->server transit time: ' + (localTime - sendTime) + 'ms, roundtrip: ' + roundTrip + 'ms, send timestamp: ' + parseInt(data[0], 10) + ', local timestamp: ' + localTime);

			this._timeSyncLog[clientId] = data;

		}
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTimeSyncExtension; }