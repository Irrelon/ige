/**
 * Adds stream capabilities to the network system.
 */
var IgeStreamComponent = IgeClass.extend({
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
			this._entity.define('_igeStream');
		}
		/* CEXCLUDE */

		if (!ige.isServer) {
			this._entity.define('_igeStream', function () { self._onStreamData.apply(self, arguments); });
		}

		this._queuedData = {};
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

	/**
	 * Gets / sets the interval by which updates to the game world are packaged
	 * and transmitted to connected clients. The greater the value, the less
	 * updates are sent per second.
	 * @param {Number=} ms The number of milliseconds between stream messages.
	 */
	sendInterval: function (ms) {
		if (ms !== undefined) {
			this.log('Setting delta stream interval to ' + ms + 'ms');
			this._streamInterval = ms;
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
		var arr = this._queuedData,
			arrIndex,
			network = this._entity,
			item;

		for (arrIndex in arr) {
			if (arr.hasOwnProperty(arrIndex)) {
				item = arr[arrIndex];
				network.send('_igeStream', item[0], item[1]);
			}
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
		//console.log(data);

		// Read the packet data into variables
		var clientTime = new Date().getTime(),
			time = clientTime - 20, // Simulate 20ms lag

			idSection, idArr, entityId, parentId, classId, entity, parent,

			sectionArr,

			sectionDataArr = data.split('|'),
			sectionDataCount = sectionDataArr.length,

			sectionIndex;

		// The first data section is always the entity ID and class name
		// so extract those from the section array
		idSection = sectionDataArr.shift();

		// Split the id section into individual parts
		idArr = idSection.split(',');
		entityId = idArr[0];
		parentId = idArr[1];
		classId = idArr[2];

		// Check that the entity parent exists
		parent = ige.$(parentId);

		if (parent) {
			// Check if the entity with this ID currently exists
			entity = ige.$(entityId);

			if (!entity) {
				// The entity does not currently exist so create it!
				entity = new igeClassStore[classId]()
					.id(entityId)
					.mount(parent);
			}

			// Get the entity stream section array
			sectionArr = entity._streamSections;

			// Now loop the data sections array and compile the rest of the
			// data string from the data section return data
			for (sectionIndex = 0; sectionIndex < sectionDataCount; sectionIndex++) {
				// Tell the entity to handle this section's data
				entity.streamSectionData(sectionArr[sectionIndex], sectionDataArr[sectionIndex]);
			}
		}
		return;

		while (count--) {
			finalDataObject = {};
			dataItem = entityMsgArray[count].split(',');

			entity = this.ige.entities.byId[dataItem[0]];
			if (entity) {
				// Only add the update to the queue if it was sent after
				// the latest update time
				if (!entity._latestUpdate) { entity._latestUpdate = 0; }
				if (typeof(entity._targetData) == 'undefined') { entity._targetData = []; }
				if (entity._latestUpdate < time) {
					finalDataObject._transform = [];
					// translate
					finalDataObject._transform[0] = parseFloat(dataItem[1]);
					finalDataObject._transform[1] = parseFloat(dataItem[2]);
					// scale
					finalDataObject._transform[3] = parseFloat(dataItem[3]);
					finalDataObject._transform[4] = parseFloat(dataItem[4]);
					// rotate
					finalDataObject._transform[6] = parseFloat(dataItem[5]);
					// origin
					finalDataObject._transform[9] = parseFloat(dataItem[6]);
					finalDataObject._transform[10] = parseFloat(dataItem[7]);
					// opacity
					finalDataObject._transform[12] = parseFloat(dataItem[8]);

					// We add this.ige.time.serverTimeDiff to the packet's time to convert
					// from the server's clock time to the clients
					entity._targetData.push([time + this.ige.time.totalServerToClientClockLatency, finalDataObject]);
					entity._nextTarget = new Date().getTime() + this._streamInterval;
				}
			}
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeStreamComponent; }