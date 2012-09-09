var IgeStreamExtension = {
	/* CEXCLUDE */
	/**
	 * Gets / sets the stream mode that the stream system will use when
	 * handling pushing data updates to connected clients.
	 * @param {Number=} val A value representing the stream mode.
	 * @return {*}
	 */
	streamMode: function (val) {
		if (val !== undefined) {
			this._streamMode = val;
			return this;
		}

		return this._streamMode;
	},

	/**
	 * Gets / sets the stream control callback function that will be called
	 * each time the entity tick method is called and stream-able data is
	 * updated.
	 * @param {Function=} method
	 * @return {*}
	 */
	streamControl: function (method) {
		if (method !== undefined) {
			this._streamControl = method;
			return this;
		}

		return this._streamControl;
	},

	/**
	 * Gets / sets the precision by which floating-point values will
	 * be encoded and sent when packaged into stream data.
	 * @param val
	 * @return {*}
	 */
	streamFloatPrecision: function (val) {
		if (val !== undefined) {
			this._streamFloatPrecision = val;

			var i, floatRemove = '\\.';

			// Update the floatRemove regular expression pattern
			for (i = 0; i < this._streamFloatPrecision; i++) {
				floatRemove += '0';
			}

			// Add the trailing comma
			floatRemove += ',';

			// Create the new regexp
			this._floatRemoveRegExp = new RegExp(floatRemove, 'g');

			return this;
		}

		return this._streamFloatPrecision;
	},

	/**
	 * Sends stream data for this entity to the specified client id or array
	 * of client ids.
	 * @param {String, Array} clientId Either a string ID or an array of string IDs of
	 * each client to send the stream data to.
	 * @return {*}
	 */
	streamSync: function (clientId) {
		if (this._streamMode === 1) {
			// Stream mode is automatic so check for the
			// control method
			if (this._streamControl) {
				// Stream control method exists, loop clients and call
				// the control method to see if data should be streamed

				// Grab an array of connected clients from the network
				// system
				var clientArr = ige.network.clients(),
					i;

				for (i in clientArr) {
					if (clientArr.hasOwnProperty(i)) {
						// Call the callback method and if it returns true,
						// send the stream data to this client
						if (this._streamControl.apply(this, [i])) {
							this._streamSync(i);
						}
					}
				}

				return this;
			} else {
				// Stream control method does not exist, send data
				// to all connected clients now
				this._streamSync();
				return this;
			}
		}

		if (this._streamMode === 2) {
			// Stream mode is advanced
			this._streamSync(clientId);

			return this;
		}

		return this;
	},

	/**
	 * Asks the network system to send the stream data to
	 * the specified client id or array of ids.
	 * @param clientId
	 * @private
	 */
	_streamSync: function (clientId) {
		ige.network.send('_igeStream', this._streamData(), clientId);
	},

	/**
	 * Generates and returns the current stream data for this entity. The
	 * data will usually include only properties that have changed since
	 * the last time the stream data was generated. The returned data is
	 * a string that has been compressed in various ways to reduce network
	 * overhead during transmission.
	 * @return {String}
	 * @private
	 */
	_streamData: function () {
		// Check if we already have a cached version of the streamData
		if (this._streadDataCache) {
			return this._streamDataCache;
		} else {
			// Let's generate our stream data
			var streamData = '';

			streamData += this.id() + ',' + this.classId() + ',' +
				// translate
				this._translate.toString(this._streamFloatPrecision) + ',' +
				// scale
				this._scale.toString(this._streamFloatPrecision) + ',' +
				// rotate
				this._rotate.toString(this._streamFloatPrecision) + ',';

			// Add any custom data to the stream string at this point


			// Remove any .00 from the string since we don't need that data
			streamData = streamData.replace(this._floatRemoveRegExp, ',');

			// Store the data in cache in case we are asked for it again this tick
			// the tick() method of the IgeEntity class clears this every tick
			this._streamDataCache = streamData;

			return streamData;
		}
	}
	/* CEXCLUDE */
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeStreamExtension; }