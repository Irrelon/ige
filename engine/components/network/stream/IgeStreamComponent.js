/**
 * Adds stream capabilities to the network system.
 */
var IgeStreamComponent = IgeEventingClass.extend({
	classId: 'IgeStreamComponent',
	componentId: 'stream',

	/**
	 * @constructor
	 * @param entity TODO: The network component usually?
	 * @param options
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		var self = this;
		
		// Set the stream data section designator character
		this._sectionDesignator = '¬';

		/* CEXCLUDE */
		if (ige.isServer) {
			// Define the network stream command
			this._entity.define('_igeStreamCreate');
			this._entity.define('_igeStreamDestroy');
			this._entity.define('_igeStreamData');

			// Define the object that will hold the stream data queue
			this._queuedData = {};

			// Set some stream data containers
			this._streamClientData = {};
			this._streamClientCreated = {};

            // Temp tick-related lists
            this._clientsWhichJoinedARoom = {};
            this._clientsWhichLeftARoom = {};

            // Add the behaviour
            ige.addBehaviour('physiStep', this._streamEntityConsistencyBehaviour, true);
		}
		/* CEXCLUDE */

		if (ige.isClient) {
			// Define the network stream command
			this._entity.define('_igeStreamCreate', function () { self._onStreamCreate.apply(self, arguments); });
			this._entity.define('_igeStreamDestroy', function () { self._onStreamDestroy.apply(self, arguments); });
			this._entity.define('_igeStreamData', function () { self._onStreamData.apply(self, arguments); });
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

    _streamEntityConsistencyBehaviour: function() {
        var self = ige.network.stream;
        //get the current client lists which joined or left a room
        var clientsWhichJoinedARoom =  self._clientsWhichJoinedARoom;
        var clientsWhichLeftARoom = self._clientsWhichLeftARoom;
        self._clientsWhichJoinedARoom = {};
        self._clientsWhichLeftARoom = {};

        //Execute the room checks
        for (var clientId in clientsWhichJoinedARoom) {
            if (clientsWhichJoinedARoom.hasOwnProperty(clientId)) {
                self._createStreamEntitiesForClient(clientId);
            }
        }

        for (var clientId in clientsWhichLeftARoom) {
            if (clientsWhichLeftARoom.hasOwnProperty(clientId)) {
                self._destroyStreamEntitiesForClient(clientId);
            }
        }
    },

	/**
	 * Queues stream data to be sent during the next stream data interval.
	 * @param {String} id The id of the entity that this data belongs to.
	 * @param {String} data The data queued for delivery to the client.
	 * @param {String} clientId The clients id this data is queued for.
	 * @return {*}
	 */
	queue: function (data, clientIds) {
        for (var x in clientIds) {
            var clientId = clientIds[x];
            if (!this._queuedData[clientId]) this._queuedData[clientId] = [];
            this._queuedData[clientId].push(data);
        }
		return this._entity;
	},

	/**
	 * Asks the server to send the data packets for all the queued stream
	 * data to the specified clients.
	 * @private
	 */
	_sendQueue: function () {
        //TODO: Have _sendQueue send as soon as all entities have gathered their data, not by an interval
		var st = new Date().getTime(),
			ct,
			dt,
			arr = this._queuedData,
            clientId,
			network = this._entity,
			item, currentTime = ige._currentTime,
			clientSentTimeData = {};

		// Send the stream data
		for (clientId in arr) {
			if (arr.hasOwnProperty(clientId)) {
				item = arr[clientId];

				// Send the starting time of the stream data
                item.unshift(currentTime);

				network.send('_igeStreamData', item, clientId);

				delete arr[clientId];
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
					//entity._streamJustCreated = true;
					
					if (entity._streamEmitCreated) {
						entity.emit('streamCreated');
					}

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
		var entity = ige.$(data[1]),
			self = this;
		
		if (entity) {
			// Calculate how much time we have left before the entity
			// should be removed from the simulation given the render
			// latency setting and the current time
			var destroyDelta = ige.network.stream._renderLatency + (ige._currentTime - data[0]);
			
			if (destroyDelta > 0) {
				// Give the entity a lifespan to destroy it in x ms
				entity.lifeSpan(destroyDelta, function () {
					self.emit('entityDestroyed', entity);
				});
			} else {
				// Destroy immediately
				self.emit('entityDestroyed', entity);
				entity.destroy();
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
        //data = JSON.parse(data);

        // set the time
        this._streamDataTime = data.shift();

        //now update all entities one by one
        for (var x = 0; x < data.length; x++) {
            var entityData = data[x];

            // Read the packet data into variables
            var entityId,
                entity,
                sectionArr,
                sectionDataArr = entityData.split(ige.network.stream._sectionDesignator),
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
	},
	
	/**
	 * Creates all non-created stream entities which share a room with the client
	 */
	_createStreamEntitiesForClient: function(clientId) {
		for (var entityId in this._streamClientCreated) {
			if (this._streamClientCreated.hasOwnProperty(entityId)) {
				//if it's not been already sent
				if (this._streamClientCreated[entityId][clientId] != true) {
					//if the entity is within the same room
					var entity = ige.$(entityId);
					if (entity != undefined) {
						var entityStreamrooms = entity._streamRoomIds;
                        for (var x in ige.network._clientRooms[clientId]) {
							if (entityStreamrooms.indexOf( ige.network._clientRooms[clientId][x] ) != -1) {
								//entity and client have a common room. Stream!
								entity.streamCreate(clientId);
								break;
							}
						}
					}
				}
			}
		}
	},
	
	/**
	 * Removes all streamed entities from the client which do not share a room with it
	 */
	_destroyStreamEntitiesForClient: function(clientId) {
		for (var entityId in this._streamClientCreated) {
			if (this._streamClientCreated.hasOwnProperty(entityId)) {
				//if it's actually created for the client
				if (this._streamClientCreated[entityId][clientId] == true) {
					//if the entity is within the same room
					var entity = ige.$(entityId);
					if (entity != undefined) {
						var entityStreamrooms = entity._streamRoomIds;
						var commonRoom = false;
                        for (var x in ige.network._clientRooms[clientId]) {
							if (entityStreamrooms.indexOf( ige.network._clientRooms[clientId][x] ) != -1) {
								//entity and client have a common room. Don't destroy.
								commonRoom = true;
								break;
							}
						}
						//if they have no common room, destroy the entity at the client
						if (!commonRoom) {
							entity.streamDestroy(clientId);
						}
					}
				}
			}
		}
	},

    _updateStreamEntityForClients: function(entity) {
        var entityId = entity.id();
        //get all clients that are in one of the entities' streamRoomIds
        var clients = ige.network.clients(entity._streamRoomIds);
        var clientIds = Object.keys(clients);

        //send a stream destroy command to all clients which don't share a room with the entity anymore
        for (var clientId in this._streamClientCreated[entityId]) {
            if (this._streamClientCreated[entityId].hasOwnProperty(clientId)) {
                //if the entity is created for the client but doesn't share a room anymore
                if (this._streamClientCreated[entityId][clientId] == true && clientIds.indexOf(clientId) == -1) {
                    //send a stream destroy command!
                    entity.streamDestroy(clientId);
                }
            }
        }

        //send the stream create command to all clients which share a room with the entity but don't have the entity stream created yet!
        for (var clientId in clients) {
            if (clients.hasOwnProperty(clientId)) {
                //if it's not been already sent
                if (!this._streamClientCreated[entityId] || this._streamClientCreated[entityId][clientId] != true) {
                    //send the stream create command!
                    entity.streamCreate(clientId);
                }
            }
        }
    }
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeStreamComponent; }