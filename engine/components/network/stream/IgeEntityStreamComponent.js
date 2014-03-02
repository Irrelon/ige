/**
 * A component object for streamed Entities
 */

var IgeEntityStreamComponent = IgeClass.extend({
    classId: 'IgeEntityStreamComponent',
    componentId: 'entityStream',

    init: function (entity, options) {
        this._entity = entity;
        var self = this;

        /* CEXCLUDE */
        if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
            // Set the stream floating point precision to 2 as default
            this.streamFloatPrecision(2);
        }
        /* CEXCLUDE */

        this._entity.on("childMounted", function(child) {
            // Check if we need to set the compositeStream and streamMode
            if (self.compositeStream()) {
                child.entityStream.compositeStream(true);
                child.entityStream.streamMode(self.streamMode());
                child.entityStream.streamControl(self.streamControl());
            }
        });

        this._entity.on("mounted", function(parent) {
            // Make sure we keep the child's room id in sync with it's parent
            if (parent.entityStream._streamRoomId) {
                self._streamRoomId = parent.entityStream._streamRoomId;
            }
        });

        entity.addBehaviour("IgeEntityStreamComponent_update", this._update);
        entity.addBehaviour("IgeEntityStreamComponent_tick", this._tick, true);
    },


    /**
     * Gets / sets the composite stream flag. If set to true, any objects
     * mounted to this component's entity will have their streamMode() set to the
	 * same value as this component and will also have their compositeStream flag
     * set to true. This allows you to easily automatically stream any objects 
	 * mounted to a root object and stream them all.
     * @param val
     * @returns {*}
     */
    compositeStream: function (val) {
        if (val !== undefined) {
            this._compositeStream = val;
            return this;
        }

        return this._compositeStream;
    },


    /**
     * Processes the updates required each render frame. Any code in the update()
     * method will be called ONCE for each render frame BEFORE the tick() method.
     * This differs from the tick() method in that the tick method can be called
     * multiple times during a render frame depending on how many viewports your
     * simulation is being rendered to, whereas the update() method is only called
     * once.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
     */
    _update: function (ctx, tickDelta) {
        // Note "this" is the entity this component is attached to here due to this function
        // being called as a result of entity.addBehaviour().

        delete this.entityStream._streamDataCache;
    },


    /**
     * Processes the actions required each render.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
     * @param {Boolean} dontTransform If set to true, the tick method should
     * not transform the context based on this component's entity's matrices. 
	 * This is useful if you have extended the class and want to process down
	 * the inheritance chain but have already transformed the context in a 
	 * previous overloaded method.
     */
    _tick: function (ctx, dontTransform) {
        // Note "this" is the entity this component is attached to here due to this function
        // being called as a result of entity.addBehaviour().

        if (!this._hidden && this._inView && (!this._parent || (this._parent._inView)) && !this._streamJustCreated) {
            // Process any automatic-mode stream updating required
            if (this.entityStream._streamMode === 1) {
                this.entityStream.streamSync();
            }
        }
    },


    /**
     * Destroys the component by freeing its stream data.
     * @example #Destroy the component
     *     entity.entityStream.destroy();
     */
    destroy: function () {

        // Check if the entity is streaming
        if (this._streamMode === 1) {
            delete this._streamDataCache;
            this.streamDestroy();
        }
    },

    
    /**
     * Gets / sets the array of sections that this component will
     * encode into its stream data.
     * @param {Array=} sectionArray An array of strings.
     * @example #Define the sections this component will use in the network stream. Use the default "transform" section as well as a "custom1" section
     *     entity.entityStream.streamSections('transform', 'custom1');
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    streamSections: function (sectionArray) {
        if (sectionArray !== undefined) {
            this._streamSections = sectionArray;
            return this;
        }

        return this._streamSections;
    },


    /**
     * Gets / sets the stream room id. If set, any streaming entities that
     * are mounted to this scene will only sync with clients that have been
     * assigned to this room id.
     *
     * @param {String} id The id of the room.
     * @returns {*}
     */
    streamRoomId: function (id) {
        if (id !== undefined) {
            this._streamRoomId = id;
            return this;
        }

        return this._streamRoomId;
    },


    /**
     * Gets / sets the data for the specified data section id. This method
     * is usually not called directly and instead is part of the network
     * stream system. General use case is to write your own custom streamSectionData
     * method in a class that extends IgeEntityStreamComponent so that you can control the
     * data that the component will send and receive over the network stream.
     * @param {String} sectionId A string identifying the section to
     * handle data get / set for.
     * @param {*=} data If present, this is the data that has been sent
     * from the server to the client for this component's entity.
     * @param {Boolean=} bypassTimeStream If true, will assign transform
     * directly to entity instead of adding the values to the time stream.
     * @return {*} "this" when a data argument is passed to allow method
     * chaining or the current value if no data argument is specified.
     */
    streamSectionData: function (sectionId, data, bypassTimeStream) {

        if(this._streamSectionDataHandlers) {
            sectionHandler = this._streamSectionDataHandlers[sectionId];
            if(sectionHandler !== undefined) {
                return sectionHandler(sectionId, data, bypassTimeStream);
            }
        }

        switch (sectionId) {
            case 'transform':
                if (data) {
                    // We have received updated data
                    var dataArr = data.split(',');

                    if (!this._entity._disableInterpolation && !bypassTimeStream && !this._entity._streamJustCreated) {
                        // Translate
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
                        this._entity._timeStream.push([ige.network.stream._streamDataTime + ige.network._latency, dataArr]);

                        // Check stream length, don't allow higher than 10 items
                        if (this._entity._timeStream.length > 10) {
                            // Remove the first item
                            this._entity._timeStream.shift();
                        }
                    } else {
                        // Assign all the transform values immediately
                        if (dataArr[0]) { this._entity._translate.x = parseFloat(dataArr[0]); }
                        if (dataArr[1]) { this._entity._translate.y = parseFloat(dataArr[1]); }
                        if (dataArr[2]) { this._entity._translate.z = parseFloat(dataArr[2]); }

                        // Scale
                        if (dataArr[3]) { this._entity._scale.x = parseFloat(dataArr[3]); }
                        if (dataArr[4]) { this._entity._scale.y = parseFloat(dataArr[4]); }
                        if (dataArr[5]) { this._entity._scale.z = parseFloat(dataArr[5]); }

                        // Rotate
                        if (dataArr[6]) { this._entity._rotate.x = parseFloat(dataArr[6]); }
                        if (dataArr[7]) { this._entity._rotate.y = parseFloat(dataArr[7]); }
                        if (dataArr[8]) { this._entity._rotate.z = parseFloat(dataArr[8]); }

                        // If we are using composite caching ensure we update the cache
                        if (this._entity._compositeCache) {
                            this.cacheDirty(true);
                        }
                    }
                } else {
                    // We should return stringified data
                    return this._entity._translate.toString(this._streamFloatPrecision) + ',' + // translate
                        this._entity._scale.toString(this._streamFloatPrecision) + ',' + // scale
                        this._entity._rotate.toString(this._streamFloatPrecision) + ','; // rotate
                }
                break;

            case 'depth':
                if (data !== undefined) {
                    if (ige.isClient) {
                        this._entity.depth(parseInt(data));
                    }
                } else {
                    return String(this._entity.depth());
                }
                break;

            case 'layer':
                if (data !== undefined) {
                    if (ige.isClient) {
                        this._entity.layer(parseInt(data));
                    }
                } else {
                    return String(this._entity.layer());
                }
                break;

            case 'bounds2d':
                if (data !== undefined) {
                    if (ige.isClient) {
                        var geom = data.split(',');
                        this._entity.bounds2d(parseFloat(geom[0]), parseFloat(geom[1]));
                    }
                } else {
                    return String(this._entity._bounds2d.x + ',' + this._entity._bounds2d.y);
                }
                break;

            case 'bounds3d':
                if (data !== undefined) {
                    if (ige.isClient) {
                        var geom = data.split(',');
                        this._entity.bounds3d(parseFloat(geom[0]), parseFloat(geom[1]), parseFloat(geom[2]));
                    }
                } else {
                    return String(this._entity._bounds3d.x + ',' + this._entity._bounds3d.y + ',' + this._entity._bounds3d.z);
                }
                break;

            case 'hidden':
                if (data !== undefined) {
                    if (ige.isClient) {
                        if (data == 'true') {
                            this._entity.hide();
                        } else {
                            this._entity.show();
                        }
                    }
                } else {
                    return String(this._entity.isHidden());
                }
                break;

            case 'mount':
                if (data !== undefined) {
                    if (ige.isClient) {
                        if (data) {
                            var newParent = ige.$(data);

                            if (newParent) {
                                this._entity.mount(newParent);
                            }
                        } else {
                            // Unmount
                            this._entity.unMount();
                        }
                    }
                } else {
                    var parent = this._entity.parent();

                    if (parent) {
                        return this._entity.parent().id();
                    } else {
                        return '';
                    }
                }
                break;

            case 'origin':
                if (data !== undefined) {
                    if (ige.isClient) {
                        var geom = data.split(',');
                        this._entity.origin(parseFloat(geom[0]), parseFloat(geom[1]), parseFloat(geom[2]));
                    }
                } else {
                    return String(this._entity._origin.x + ',' + this._entity._origin.y + ',' + this._entity._origin.z);
                }
                break;
        }
    },

    /**
     * Gets / sets the callback handler for the specified data section id.
     * @param {String} sectionId A string identifying the section to
     * handle data get / set for.
     * @param {Function=} handler If present, this is the function that will be
     * called when streaming data is sent or received.
     * @return {*} "this" when a handler argument is passed to allow method
     * chaining or the current value if no handler argument is specified.
     */
    streamSectionDataHandler: function(sectionId, handler) {
        this._streamSectionDataHandlers = this._streamSectionDataHandlers || {};

        if (sectionId !== undefined && handler !== undefined) {
            this._streamSectionDataHandlers[sectionId] = handler;
            return this;
        }

        return this._streamSectionDataHandlers[sectionId];
    },


    /**
     * Gets / sets the stream mode that the stream system will use when
     * handling pushing data updates to connected clients.
     * @param {Number=} val A value representing the stream mode.
     * @example #Set the entity to disable streaming
     *     entity.entityStream.streamMode(0);
     * @example #Set the entity to automatic streaming
     *     entity.entityStream.streamMode(1);
     * @example #Set the entity to manual (advanced mode) streaming
     *     entity.entityStream.streamMode(2);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    streamMode: function (val) {
        if (val !== undefined) {
            if (ige.isServer) {
                this._streamMode = val;
            }
            return this;
        }

        return this._streamMode;
    },


    /**
     * Gets / sets the stream control callback function that will be called
     * each time the component tick method is called and stream-able data is
     * updated.
     * @param {Function=} method The stream control method.
     * @example #Set the entity's stream control method to control when an entity is streamed and when it is not
     *     entity.entityStream.streamControl(function (clientId) {
     *         // Let's use an example where we only want this entity to stream
     *         // to one particular client with the id 4039589434
     *         if (clientId === '4039589434') {
     *             // Returning true tells the network stream to send data
     *             // about this entity to the client
     *             return true;
     *         } else {
     *             // Returning false tells the network stream NOT to send
     *             // data about this entity to the client
     *             return false;
     *         }
     *     });
     *
     * Further reading: [Controlling Streaming](http://www.isogenicengine.com/documentation/isogenic-game-engine/versions/1-1-0/manual/networking-multiplayer/realtime-network-streaming/stream-modes-and-controlling-streaming/)
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    streamControl: function (method) {
        if (method !== undefined) {
            this._streamControl = method;
            return this;
        }

        return this._streamControl;
    },


    /**
     * Gets / sets the stream sync interval. This value
     * is in milliseconds and cannot be lower than 16. It will
     * determine how often data from this component's entity is added to the
     * stream queue.
     * @param {Number=} val Number of milliseconds between adding
     * stream data for this component's entity to the stream queue.
     * @param {String=} sectionId Optional id of the stream data
     * section you want to set the interval for. If omitted the
     * interval will be applied to all sections.
     * @example #Set the entity's stream update (sync) interval to 1 second because this entity's data is not highly important to the simulation so save some bandwidth!
     *     entity.entityStream.streamSyncInterval(1000);
     * @example #Set the entity's stream update (sync) interval to 16 milliseconds because this entity's data is very important to the simulation so send as often as possible!
     *     entity.entityStream.streamSyncInterval(16);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    streamSyncInterval: function (val, sectionId) {
        if (val !== undefined) {
            if (!sectionId) {
                if (val < 16) {
                    delete this._streamSyncInterval;
                } else {
                    this._streamSyncDelta = 0;
                    this._streamSyncInterval = val;
                }
            } else {
                this._streamSyncSectionInterval = this._streamSyncSectionInterval || {};
                this._streamSyncSectionDelta = this._streamSyncSectionDelta || {};
                if (val < 16) {
                    delete this._streamSyncSectionInterval[sectionId];
                } else {
                    this._streamSyncSectionDelta[sectionId] = 0;
                    this._streamSyncSectionInterval[sectionId] = val;
                }
            }
            return this;
        }

        return this._streamSyncInterval;
    },


    /**
     * Gets / sets the precision by which floating-point values will
     * be encoded and sent when packaged into stream data.
     * @param {Number=} val The number of decimal places to preserve.
     * @example #Set the float precision to 2
     *     // This will mean that any data using floating-point values
     *     // that gets sent across the network stream will be rounded
     *     // to 2 decimal places. This helps save bandwidth by not
     *     // having to send the entire number since precision above
     *     // 2 decimal places is usually not that important to the
     *     // simulation.
     *     entity.entityStream.streamFloatPrecision(2);
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
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
     * Queues stream data for this component's entity to be sent to the
     * specified client id or array of client ids.
     * @param {Array} clientId An array of string IDs of each
     * client to send the stream data to.
     * @return {IgeEntity} "this".
     */
    streamSync: function (clientId) {
        if (this._streamMode === 1) {
            // Check if we have a stream sync interval
            if (this._streamSyncInterval) {
                this._streamSyncDelta += ige._tickDelta;

                if (this._streamSyncDelta < this._streamSyncInterval) {
                    // The stream sync interval is still higher than
                    // the stream sync delta so exit without calling the
                    // stream sync method
                    return this;
                } else {
                    // We've reached the delta we want so zero it now
                    // ready for the next loop
                    this._streamSyncDelta = 0;
                }
            }

            // Grab an array of connected clients from the network
            // system
            var recipientArr = [],
                clientArr = ige.network.clients(this._streamRoomId),
                i;

            for (i in clientArr) {
                if (clientArr.hasOwnProperty(i)) {
                    // Check for a stream control method
                    if (this._streamControl) {
                        // Call the callback method and if it returns true,
                        // send the stream data to this client
                        if (this._streamControl.apply(this, [i, this._streamRoomId])) {
                            recipientArr.push(i);
                        }
                    } else {
                        // No control method so process for this client
                        recipientArr.push(i);
                    }
                }
            }

            this._streamSync(recipientArr);
            return this;
        }

        if (this._streamMode === 2) {
            // Stream mode is advanced
            this._streamSync(clientId, this._streamRoomId);

            return this;
        }

        return this;
    },


    /**
     * Sends data through to the client when it is being created on the 
	 * client for the first time through the network stream. The data 
	 * will be provided as the first argument in the constructor call 
	 * to the entity class so you should expect to receive it as per 
	 * this example:
     * @example #Using and Receiving Stream Create Data
     *     var MyNewClass = IgeEntity.extend({
     *         classId: 'MyNewClass',
     *
     *         // Define the init with the parameter to receive the
     *         // data you return in the streamCreateData() method
     *         init: function (myCreateData) {
     *             this._myData = myCreateData;
	 *
	 *             if (ige.isServer) {
	 *                 this.entityStream.streamCreateDataCallback(function () {
	 *                     return this._myData;
	 *                 });
	 *             }
     *         },
     *     });
     *
     * Valid return values must not include circular references!
     */
    streamCreateData: function () {
        if(this._streamCreateDataCallback) {
            return this._streamCreateDataCallback();
        }
    },


    /**
     * Gets / sets the callback handler for creation time stream data.
     * @param {Function=} callback If present, this is the function that will be
     * called when this component's entity is being streamed to the client for the
	 * first time.
     * @return {*} "this" when a callback argument is passed to allow method
     * chaining or the current value if no callback argument is specified.
     */
    streamCreateDataCallback: function(callback) {
        if (callback !== undefined) {
            this._streamCreateDataCallback = callback;
            return this;
        }

        return this._streamCreateDataCallback;
    },

    /**
     * Gets / sets the stream emit created flag. If set to true this component
     * emits a "streamCreated" event when its entity is created by the stream,
	 * but after the entity's id and initial transform are set.
     * @param val
     * @returns {*}
     */
    streamEmitCreated: function (val) {
        if (val !== undefined) {
            this._streamEmitCreated = val;
            return this;
        }
        
        return this._streamEmitCreated;
    },
    
    /**
     * Asks the stream system to queue the stream data to the specified
     * client id or array of ids.
     * @param {Array} recipientArr The array of ids of the client(s) to
     * queue stream data for. The stream data being queued
     * is returned by a call to this._streamData().
     * @param {String} streamRoomId The id of the room the entity belongs
     * in (can be undefined or null if no room assigned).
     * @private
     */
    _streamSync: function (recipientArr, streamRoomId) {
        var arrCount = recipientArr.length,
            arrIndex,
            clientId,
            stream = ige.network.stream,
            thisId = this._entity.id(),
            filteredArr = [],
            createResult = true; // We set this to true by default

        // Loop the recipient array
        for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
            clientId = recipientArr[arrIndex];

            // Check if the client has already received a create
            // command for this entity
            stream._streamClientCreated[thisId] = stream._streamClientCreated[thisId] || {};
            if (!stream._streamClientCreated[thisId][clientId]) {
                createResult = this.streamCreate(clientId);
            }

            // Make sure that if we had to create the entity for
            // this client that the create worked before bothering
            // to waste bandwidth on stream updates
            if (createResult) {
                // Get the stream data
                var data = this._streamData();

                // Is the data different from the last data we sent
                // this client?
                stream._streamClientData[thisId] = stream._streamClientData[thisId] || {};

                if (stream._streamClientData[thisId][clientId] != data) {
                    filteredArr.push(clientId);

                    // Store the new data for later comparison
                    stream._streamClientData[thisId][clientId] = data;
                }
            }
        }

        if (filteredArr.length) {
            stream.queue(thisId, data, filteredArr);
        }
    },

	/**
	 * Forces the stream to push this component's entity's full stream
	 * data on the next stream sync regardless of what clients have
	 * received in the past. This should only be used when required
	 * rather than every tick as it will reduce the overall efficiency
	 * of the stream if used every tick.
	 * @returns {*}
	 */
	streamForceUpdate: function () {
		if (ige.isServer) {
			var thisId = this._entity.id();
			
			// Invalidate the stream client data lookup to ensure
			// the latest data will be pushed on the next stream sync
			if (ige.network && ige.network.stream && ige.network.stream._streamClientData && ige.network.stream._streamClientData[thisId]) {
				ige.network.stream._streamClientData[thisId] = {};
			}
		}
		
		return this;
	},

    /**
     * Issues a create entity command to the passed client id
     * or array of ids. If no id is passed it will issue the
     * command to all connected clients. If using streamMode(1)
     * this method is called automatically.
     * @param {*} clientId The id or array of ids to send
     * the command to.
     * @example #Send a create command for this entity to all clients
     *     entity.entityStream.streamCreate();
     * @example #Send a create command for this entity to an array of client ids
     *     entity.entityStream.streamCreate(['43245325', '326755464', '436743453']);
     * @example #Send a create command for this entity to a single client id
     *     entity.entityStream.streamCreate('43245325');
     * @return {Boolean}
     */
    streamCreate: function (clientId) {
        if (this._entity._parent) {
            var thisId = this._entity.id(),
                arr,
                i;

            // Send the client an entity create command first
            ige.network.send('_igeStreamCreate', [
                this._entity.classId(),
                thisId,
                this._entity._parent.id(),
                this.streamSectionData('transform'),
                this.streamCreateData()
            ], clientId);

            ige.network.stream._streamClientCreated[thisId] = ige.network.stream._streamClientCreated[thisId] || {};

            if (clientId) {
                // Mark the client as having received a create
                // command for this entity
                ige.network.stream._streamClientCreated[thisId][clientId] = true;
            } else {
                // Mark all clients as having received this create
                arr = ige.network.clients();

                for (i in arr) {
                    if (arr.hasOwnProperty(i)) {
                        ige.network.stream._streamClientCreated[thisId][i] = true;
                    }
                }
            }

            return true;
        }

        return false;
    },

    /**
     * Issues a destroy entity command to the passed client id
     * or array of ids. If no id is passed it will issue the
     * command to all connected clients. If using streamMode(1)
     * this method is called automatically.
     * @param {*} clientId The id or array of ids to send
     * the command to.
     * @example #Send a destroy command for this entity to all clients
     *     entity.entityStream.streamDestroy();
     * @example #Send a destroy command for this entity to an array of client ids
     *     entity.entityStream.streamDestroy(['43245325', '326755464', '436743453']);
     * @example #Send a destroy command for this entity to a single client id
     *     entity.entityStream.streamDestroy('43245325');
     * @return {Boolean}
     */
    streamDestroy: function (clientId) {
        var thisId = this._entity.id(),
            arr,
            i;

        // Send clients the stream destroy command for this entity
        ige.network.send('_igeStreamDestroy', [ige._currentTime, thisId], clientId);

        ige.network.stream._streamClientCreated[thisId] = ige.network.stream._streamClientCreated[thisId] || {};
        ige.network.stream._streamClientData[thisId] = ige.network.stream._streamClientData[thisId] || {};

        if (clientId) {
            // Mark the client as having received a destroy
            // command for this entity
            ige.network.stream._streamClientCreated[thisId][clientId] = false;
            igeige.network.stream._streamClientData[thisId][clientId] = undefined;
        } else {
            // Mark all clients as having received this destroy
            arr = ige.network.clients();

            for (i in arr) {
                if (arr.hasOwnProperty(i)) {
                    ige.network.stream._streamClientCreated[thisId][i] = false;
                    ige.network.stream._streamClientData[thisId][i] = undefined;
                }
            }
        }

        return true;
    },


    /**
     * Generates and returns the current stream data for this component. The
     * data will usually include only properties that have changed since
     * the last time the stream data was generated. The returned data is
     * a string that has been compressed in various ways to reduce network
     * overhead during transmission.
     * @return {String} The string representation of the stream data for
     * this entity.
     * @private
     */
    _streamData: function () {
        // Check if we already have a cached version of the streamData
        if (this._streamDataCache) {
            return this._streamDataCache;
        } else {
            // Let's generate our stream data
            var streamData = '',
                sectionDataString = '',
                sectionArr = this._streamSections,
                sectionCount = sectionArr.length,
                sectionData,
                sectionIndex,
                sectionId;

            // Add the entity id
            streamData += this._entity.id();

            // Only send further data if the entity is still "alive"
            if (this._entity._alive) {
                // Now loop the data sections array and compile the rest of the
                // data string from the data section return data
                for (sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
                    sectionData = '';
                    sectionId = sectionArr[sectionIndex];

                    // Stream section sync intervals allow individual stream sections
                    // to be streamed at different (usually longer) intervals than other
                    // sections so you could for instance reduce the number of updates
                    // a particular section sends out in a second because the data is
                    // not that important compared to updated transformation data
                    if (this._streamSyncSectionInterval && this._streamSyncSectionInterval[sectionId]) {
                        // Check if the section interval has been reached
                        this._streamSyncSectionDelta[sectionId] += ige._tickDelta;

                        if (this._streamSyncSectionDelta[sectionId] >= this._streamSyncSectionInterval[sectionId]) {
                            // Get the section data for this section id
                            sectionData = this.streamSectionData(sectionId);

                            // Reset the section delta
                            this._streamSyncSectionDelta[sectionId] = 0;
                        }
                    } else {
                        // Get the section data for this section id
                        sectionData = this.streamSectionData(sectionId);
                    }

                    // Add the section start designator character. We do this
                    // regardless of if there is actually any section data because
                    // we want to be able to identify sections in a serial fashion
                    // on receipt of the data string on the client
                    sectionDataString += ige.network.stream._sectionDesignator;

                    // Check if we were returned any data
                    if (sectionData !== undefined) {
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
            }

            // Store the data in cache in case we are asked for it again this tick
            // the update() method of the IgeEntity class clears this every tick
            this._streamDataCache = streamData;

            return streamData;
        }
    }
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntityStreamComponent; }