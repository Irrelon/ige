/**
 * Adds stream capabilities to the network system.
 */
var IgeStreamComponent = IgeEventingClass.extend({
	classId: 'IgeStreamComponent',
	componentId: 'stream',

	/**
	 * @constructor
	 * @param entity
	 * @param options
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		var self = this;

		/* CEXCLUDE */
		if (ige.isServer) {
			// Define the network stream command
			this._entity.define('_igeStreamCreate');
			this._entity.define('_igeStreamDestroy');
			this._entity.define('_igeStreamData');
			this._entity.define('_igeStreamTime');

			// Define the object that will hold the stream data queue
			this._queuedData = {};

			// Set some stream data containers
			this._streamClientData = {};
			this._streamClientCreated = {};
		}
		/* CEXCLUDE */

		if (!ige.isServer) {
			// Define the network stream command
			this._entity.define('_igeStreamCreate', function () { self._onStreamCreate.apply(self, arguments); });
			this._entity.define('_igeStreamDestroy', function () { self._onStreamDestroy.apply(self, arguments); });
			this._entity.define('_igeStreamData', function () { self._onStreamData.apply(self, arguments); });
			this._entity.define('_igeStreamTime', function () { self._onStreamTime.apply(self, arguments); });
		}

		// Set some defaults
		this._renderLatency = 100;
		this._streamInterval = 50;
	},

	/**
	 * Gets /Sets the amount of milliseconds in the past that the renderer will
	 * show updates from the stream. This allows us to interpolate from a previous
	 * position to the next position in the stream update. Updates come in and
	 * are already in the past when they are received so we need to set this
	 * latency value to something greater than the highest level of acceptable
	 * network latency. Usually this is a value between 100 and 200ms. If your
	 * game requires much tighter latency you will have to reduce the number of
	 * players / network updates / data size in order to compensate. A value of
	 * 100 in this call is the standard that most triple-A FPS games accept as
	 * normal render latency and should be OK for your game.
	 *
	 * @param latency
	 */
	renderLatency: function (latency) {
		if (latency !== undefined) {
			this._renderLatency = latency;
			return this._entity;
		}

		return this._renderLatency;
	},

	/* CEXCLUDE */
	/**
	 * Gets / sets the interval by which updates to the game world are packaged
	 * and transmitted to connected clients. The greater the value, the less
	 * updates are sent per second.
	 * @param {Number=} ms The number of milliseconds between stream messages.
	 */
	sendInterval: function (ms) {
		if (ms !== undefined) {
			this.log('Setting delta stream interval to ' + (ms / ige._timeScale) + 'ms');
			this._streamInterval = ms / ige._timeScale;
			return this._entity;
		}

		return this._streamInterval;
	},

	/**
	 * Starts the stream of world updates to connected clients.
	 */
	start: function () {
		var self = this;

		this.log('Starting delta stream...');
		this._streamTimer = setInterval(function () { self._sendQueue(); }, this._streamInterval);

		return this._entity;
	},

	/**
	 * Stops the stream of world updates to connected clients.
	 */
	stop: function () {
		this._stopTimeSync();

		this.log('Stopping delta stream...');
		clearInterval(this._streamTimer);

		return this._entity;
	},

	/**
	 * Queues stream data to be sent during the next stream data interval.
	 * @param id
	 * @param data
	 * @param clientId
	 * @return {*}
	 */
	queue: function (id, data, clientId) {
		this._queuedData[id] = [data, clientId];
		return this._entity;
	},

	/**
	 * Asks the server to send the data packets for all the queued stream
	 * data to the specified clients.
	 * @private
	 */
	_sendQueue: function () {
		var st = new Date().getTime(),
			ct,
			dt,
			arr = this._queuedData,
			arrIndex,
			network = this._entity,
			item, currentTime = ige._currentTime,
			clientSentTimeData = {};

		// Send the stream data
		for (arrIndex in arr) {
			if (arr.hasOwnProperty(arrIndex)) {
				item = arr[arrIndex];

				// Check if we've already sent this client the starting
				// time of the stream data
				if (!clientSentTimeData[item[1]]) {
					// Send the stream start time
					network.send('_igeStreamTime', currentTime, item[1]);
					clientSentTimeData[item[1]] = true;
				}
				network.send('_igeStreamData', item[0], item[1]);

				delete arr[arrIndex];
			}

			ct = new Date().getTime();
			dt = ct - st;

			if (dt > this._streamInterval) {
				console.log('WARNING, Stream send is taking too long: ' + dt + 'ms');
				break;
			}
		}
	},
	/* CEXCLUDE */

	/**
	 * Handles receiving the start time of the stream data.
	 * @param data
	 * @private
	 */
	_onStreamTime: function (data) {
		this._streamDataTime = data;
	},

	_onStreamCreate: function (data) {
		var classId = data[0],
			entityId = data[1],
			parentId = data[2],
			transformData = data[3],
			createData = data[4],
			parent = ige.$(parentId),
			classConstructor,
			entity;

		// Check the required class exists
		if (parent) {
			// Check that the entity doesn't already exist
			if (!ige.$(entityId)) {
				classConstructor = igeClassStore[classId];

				if (classConstructor) {
					// The entity does not currently exist so create it!
					entity = new classConstructor(createData)
						.id(entityId)
						.mount(parent);
					
					entity.streamSectionData('transform', transformData, true);

					// Set the just created flag which will stop the renderer
					// from handling this entity until after the first stream
					// data has been received for it
					entity._streamJustCreated = true;

					// Since we just created an entity through receiving stream
					// data, inform any interested listeners
					this.emit('entityCreated', entity);
				} else {
					ige.network.stop();
					ige.stop();

					this.log('Network stream cannot create entity with class ' + classId + ' because the class has not been defined! The engine will now stop.', 'error');
				}
			}
		} else {
			this.log('Cannot properly handle network streamed entity with id ' + entityId + ' because it\'s parent with id ' + parentId + ' does not exist on the scenegraph!', 'warning');
		}
	},

	_onStreamDestroy: function (data) {
		var entity = ige.$(data);
		if (entity) {
			entity.destroy();
			this.emit('entityDestroyed', entity);
		}
	},

	/**
	 * Called when the client receives data from the stream system.
	 * Handles decoding the data and calling the relevant entity
	 * _onStreamData() methods.
	 * @param data
	 * @private
	 */
	_onStreamData: function (data) {
		// Read the packet data into variables
		var entityId,
			entity,
			sectionArr,
			sectionDataArr = data.split('|'),
			sectionDataCount = sectionDataArr.length,
			sectionIndex,
			justCreated;

		// We know the first bit of data will always be the
		// target entity's ID
		entityId = sectionDataArr.shift();

		// Check if the entity with this ID currently exists
		entity = ige.$(entityId);

		if (entity) {
			// Hold the entity's just created flag
			justCreated = entity._streamJustCreated;

			// Get the entity stream section array
			sectionArr = entity._streamSections;

			// Now loop the data sections array and compile the rest of the
			// data string from the data section return data
			for (sectionIndex = 0; sectionIndex < sectionDataCount; sectionIndex++) {
				// Tell the entity to handle this section's data
				entity.streamSectionData(sectionArr[sectionIndex], sectionDataArr[sectionIndex], justCreated);
			}

			// Now that the entity has had it's first bit of data
			// reset the just created flag
			delete entity._streamJustCreated;
		} else {
			this.log('+++ Stream: Data received for unknown entity (' + entityId +')');
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeStreamComponent; }