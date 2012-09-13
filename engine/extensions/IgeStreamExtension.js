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
	 * Gets / sets the array of sections that this entity will
	 * encode into its stream data.
	 * @param {Array=} sectionArray An array of strings.
	 * @return {*}
	 */
	streamSections: function (sectionArray) {
		if (sectionArray !== undefined) {
			this._streamSections = sectionArray;
			return this;
		}

		return this._streamSections;
	},

	/**
	 * Gets / sets the data for the specified data section id.
	 * @param {String} sectionId A string identifying the section to handle data get / set for.
	 * @param {*=} data If present, this is the data that has been sent from the server to the client for this entity.
	 * @return {*}
	 */
	streamSectionData: function (sectionId, data) {
		if (sectionId === 'transform') {
			if (data) {
				// We have received updated data
				// Translate
				var dataArr = data.split(',');
				if (dataArr[0]) { dataArr[0] = parseFloat(dataArr[0]); }
				if (dataArr[1]) { dataArr[1] = parseFloat(dataArr[1]); }
				if (dataArr[2]) { dataArr[2] = parseFloat(dataArr[2]); }

				// Scale
				if (dataArr[3]) { dataArr[3] = parseFloat(dataArr[3]); }
				if (dataArr[4]) { dataArr[4] = parseFloat(dataArr[4]); }
				if (dataArr[5]) { dataArr[5] = parseFloat(dataArr[5]); }

				// Rotate
				if (dataArr[6]) { dataArr[6] = parseFloat(dataArr[6]); }
				if (dataArr[7]) { dataArr[7] = parseFloat(dataArr[7]); }
				if (dataArr[8]) { dataArr[8] = parseFloat(dataArr[8]); }

				// Add it to the time stream
				this._timeStream.push([ige.network.stream._streamDataTime, dataArr]);

				// Check stream length, don't allow higher than 20 items
				if (this._timeStream.length > 20) {
					// Remove the first item
					this._timeStream.shift();
				}
			} else {
				// We should return stringified data
				return this._translate.toString(this._streamFloatPrecision) + ',' + // translate
					this._scale.toString(this._streamFloatPrecision) + ',' + // scale
					this._rotate.toString(this._streamFloatPrecision) + ','; // rotate
			}
		}
	},

	/**
	 * Asks the stream system to queue the stream data to
	 * the specified client id or array of ids.
	 * @param clientId
	 * @private
	 */
	_streamSync: function (clientId) {
		ige.network.stream.queue(this.id(), this._streamData(), clientId);
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
			var streamData = '',
				sectionDataString = '',
				sectionArr = this._streamSections,
				sectionCount = sectionArr.length,
				sectionData,
				sectionIndex;

			// Add the default data (id and class)
			streamData += this.id() + ',' + this._parent.id() + ',' + this.classId();

			// Now loop the data sections array and compile the rest of the
			// data string from the data section return data
			for (sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
				// Get the section data for this section id
				sectionData = this.streamSectionData(sectionArr[sectionIndex]);

				// Add the section start designator character. We do this
				// regardless of if there is actually any section data because
				// we want to be able to identify sections in a serial fashion
				// on receipt of the data string on the client
				sectionDataString += '|';

				// Check if we were returned any data
				if (sectionData) {
					// Add the data to the section string
					sectionDataString += sectionData;
				}
			}

			// Add any custom data to the stream string at this point
			if (sectionDataString) {
				streamData += sectionDataString;
			}

			// Remove any .00 from the string since we don't need that data
			// TODO: What about if a property is a string with something.00 and it should be kept?
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