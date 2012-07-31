// Our namespace
var NetIo = {};

/**
 * Define the debug options object.
 * @type {Object}
 * @private
 */
NetIo._debug = {
	node: typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined',
	level: ['log', 'warning', 'error'],
	stacks: false,
	throwErrors: true,
	trace: {
		setup: false,
		enabled: false,
		match: ''
	}
};

/**
 * Define the class system.
 * @type {*}
 */
NetIo.Class = (function () {
	var initializing = false,
		fnTest = /xyz/.test(function () {xyz;}) ? /\b_super\b/ : /.*/,

	// The base Class implementation (does nothing)
		Class = function () {},
	// TODO: Add parameters to all the doc comments below.
		/**
		 * Provides logging capabilities to all Class instances.
		 */
			log = function (text, type, obj) {
			var indent = '',
				i,
				stack;
			if (!NetIo._debug.trace.indentLevel) { NetIo._debug.trace.indentLevel = 0; }

			for (i = 0; i < NetIo._debug.trace.indentLevel; i++) {
				indent += '  ';
			}

			type = type || 'log';

			if (type === 'error') {
				if (NetIo._debug.stacks) {
					if (NetIo._debug.node) {
						stack = new Error().stack;
						//console.log(color.magenta('Stack:'), color.red(stack));
						console.log('Stack:', stack);
					} else {
						if (typeof(printStackTrace) === 'function') {
							console.log('Stack:', printStackTrace().join('\n ---- '));
						}
					}
				}

				if (NetIo._debug.throwErrors) {
					throw(indent + 'Net.io *' + type + '* [' + (this._classId || this.prototype._classId) + '] : ' + text);
				} else {
					console.log(indent + 'Net.io *' + type + '* [' + (this._classId || this.prototype._classId) + '] : ' + text);
				}
			} else {
				console.log(indent + 'Net.io *' + type + '* [' + (this._classId || this.prototype._classId) + '] : ' + text);
			}

			return this;
		},

		/**
		 * Gets / sets the class id. Primarily used to help identify
		 * what class an instance was instantiated with and is also
		 * output during the ige.scenegraph() method's console logging
		 * to show what class an object belogs to.
		 */
			classId = function (name) {
			if (typeof(name) !== 'undefined') {
				if (this._classId) {
					this._classId = name;
				} else {
					this.prototype._classId = name;
				}
				return this;
			}

			return (this._classId || this.prototype._classId);
		},

		/**
		 * Creates a new instance of the component argument passing
		 * the options argument to the component as it is initialised.
		 * The new component instance is then added to "this" via
		 * a property name that is defined in the component class as
		 * "componentId".
		 */
			addComponent = function (component, options) {
			var newComponent = new component(this, options);
			this[newComponent.componentId] = newComponent;
			return this;
		},

		/**
		 * Copies all properties and methods from the classObj object
		 * to "this". If the overwrite flag is not set or set to false,
		 * only properties and methods that don't already exists in
		 * "this" will be copied. If overwrite is true, they will be
		 * copied regardless.
		 */
			implement = function (classObj, overwrite) {
			var i, obj = classObj.prototype || classObj;

			// Copy the class object's properties to (this)
			for (i in obj) {
				// Only copy the property if this doesn't already have it
				if (obj.hasOwnProperty(i) && (overwrite || this[i] === undefined)) {
					this[i] = obj[i];
				}
			}
			return this;
		},

		/**
		 * Gets / sets a key / value pair in the object's data object. Useful for
		 * storing arbitrary game data in the object.
		 * @param {String} key The key under which the data resides.
		 * @param {*=} value The data to set under the specified key.
		 * @return {*}
		 */
			data = function (key, value) {
			if (key !== undefined) {
				if (value !== undefined) {
					this._data[key] = value;

					return this;
				}

				return this._data[key];
			}
		};

	// Create a new Class that inherits from this class
	Class.extend = function () {
		var _super = this.prototype,
			name,
			prototype,
		// Set prop to the last argument passed
			prop = arguments[arguments.length - 1],
			extensionArray = arguments[0],
			extensionItem,
			extensionOverwrite,
			extensionIndex,
			propertyIndex,
			propertyObject;

		// Instantiate a base class (but only create the instance,
		// don't run the init constructor)
		initializing = true;
		prototype = new this();
		initializing = false;

		// Copy the properties over onto the new prototype
		for (name in prop) {
			// Check if we're overwriting an existing function
			if (typeof(prop[name]) === "function" && typeof(_super[name]) === "function" && fnTest.test(prop[name])) {
				// Allow access to original source code
				// so we can edit the engine live
				prototype['__' + name] = prop[name];

				// Assign a new method to allow access to the
				// super-class method via this._super() in the
				// new method
				prototype[name] = (function (name, fn) {
					return function () {
						var tmp = this._super,
							ret;

						// Add a new ._super() method that is the same method
						// but on the super-class
						this._super = _super[name];

						// The method only need to be bound temporarily, so we
						// remove it when we're done executing
						ret = fn['__' + name].apply(this, arguments);
						//ret = fn.apply(this, arguments);
						this._super = tmp;

						return ret;
					};
				}(name, prototype));
			} else {
				// The prop is not a method
				prototype[name] = prop[name];
			}
		}

		// Now implement any other extensions
		if (arguments.length > 1) {
			if (extensionArray && extensionArray.length) {
				for (extensionIndex = 0; extensionIndex < extensionArray.length; extensionIndex++) {
					extensionItem = extensionArray[extensionIndex];
					propertyObject = extensionItem.extension.prototype || extensionItem.extension;
					extensionOverwrite = extensionItem.overwrite;

					// Copy the class object's properties to (this)
					for (propertyIndex in propertyObject) {
						// Only copy the property if this doesn't already have it or
						// the extension is set to overwrite any existing properties
						if (propertyObject.hasOwnProperty(propertyIndex) && (extensionOverwrite || prototype[propertyIndex] === undefined)) {
							prototype[propertyIndex] = propertyObject[propertyIndex];
						}
					}
				}
			}
		}

		// The dummy class constructor
		function Class() {
			this._data = {};
			if (!initializing && this.init) {
				this.init.apply(this, arguments);
			}
		}

		// Populate our constructed prototype object
		Class.prototype = prototype;

		// Enforce the constructor to be what we expect
		Class.prototype.constructor = Class;

		// And make this class extendable
		Class.extend = arguments.callee;

		// Add log capability
		Class.prototype.log = log;

		// Add data capability
		Class.prototype.data = data;

		// Add class name capability
		Class.prototype.classId = classId;
		Class.prototype._classId = prop.classId || 'Class';

		// Add the addComponent method
		Class.prototype.addComponent = addComponent;

		// Add the implement method
		Class.prototype.implement = implement;

		return Class;
	};

	return Class;
}());

NetIo.EventingClass = NetIo.Class.extend({
	/**
	 * Add an event listener method for an event.
	 * @param {String || Array} eventName The name of the event to listen for (string), or an array of events to listen for.
	 * @param {Function} call The method to call when the event listener is triggered.
	 * @param {Object=} context The context in which the call to the listening method will be made (sets the 'this' variable in the method to the object passed as this parameter).
	 * @param {Boolean=} oneShot If set, will instruct the listener to only listen to the event being fired once and will not fire again.
	 * @param {Boolean=} sendEventName If set, will instruct the emitter to send the event name as the argument instead of any emitted arguments.
	 * @return {Object}
	 */
	on: function (eventName, call, context, oneShot, sendEventName) {
		// Check that we have an event listener object
		this._eventListeners = this._eventListeners || {};

		if (typeof call == 'function') {
			if (typeof eventName == 'string') {
				// Check if this event already has an array of listeners
				this._eventListeners[eventName] = this._eventListeners[eventName] || [];

				// Compose the new listener
				var newListener = {
					call:call,
					context:context,
					oneShot:oneShot,
					sendEventName:sendEventName
				};

				// Check if we already have this listener in the list
				var addListener = true;

				// TO-DO - Could this do with using indexOf? Would that work? Would be faster?
				for (var i in this._eventListeners[eventName]) {
					if (this._eventListeners[eventName][i] == newListener) {
						addListener = false;
						break;
					}
				}

				// Add this new listener
				if (addListener) {
					this._eventListeners[eventName].push(newListener);
				}

				return newListener;
			} else {
				// The eventName is an array of names, creating a group of events
				// that must be fired to fire this event callback
				if (eventName.length) {
					// Loop the event array
					var multiEvent = [];
					multiEvent[0] = 0; // This will hold our event count total
					multiEvent[1] = 0; // This will hold our number of events fired
					multiEvent[2] = []; // This will hold the list of already-fired event names

					// Define the multi event callback
					multiEvent[3] = this.bind(function (firedEventName) {
						if (multiEvent[2].indexOf(firedEventName) == -1) {
							multiEvent[2].push(firedEventName);
							multiEvent[1]++;

							if (multiEvent[0] == multiEvent[1]) {
								call.apply(context || this);
							}
						}
					});

					for (var eventIndex in eventName) {
						var eventData = eventName[eventIndex];
						var eventObj = eventData[0];
						var eventNameArray = eventData[1];

						multiEvent[0] += eventNameArray.length;

						for (var singleEventIndex in eventNameArray) {
							// Get the event name
							var singleEventName = eventNameArray[singleEventIndex];

							// Register each event against the event object with a callback
							eventObj.on(singleEventName, multiEvent[3], null, true, true);
						}
					}
				}
			}
		} else {
			if (typeof(eventName) != 'string') {
				eventName = '*Multi-Event*'
			}
			this.log('Cannot register event listener for event "' + eventName + '" because the passed callback is not a function!', 'error');
		}
	},

	/**
	 * Emit an event by name.
	 * @param {Object} eventName The name of the event to listen for.
	 * @param {Object || Array} args The arguments to send to any listening methods. If you are sending multiple arguments, use an array containing each argument.
	 * @return {Number}
	 */
	emit: function (eventName, args) {
		if (this._eventListeners) {
			// Check if the event has any listeners
			if (this._eventListeners[eventName]) {

				// Fire the listeners for this event
				var eventCount = this._eventListeners[eventName].length,
					eventCount2 = this._eventListeners[eventName].length - 1;

				// If there are some events, ensure that the args is ready to be used
				if (eventCount) {
					var finalArgs = [];
					if (typeof(args) == 'object' && args != null && args[0] != null) {
						for (var i in args) {
							finalArgs[i] = args[i];
						}
					} else {
						finalArgs = [args];
					}

					// Loop and emit!
					var cancelFlag = false,
						eventIndex;

					while (eventCount--) {
						eventIndex = eventCount2 - eventCount;
						var tempEvt = this._eventListeners[eventName][eventIndex];

						// If the sendEventName flag is set, overwrite the arguments with the event name
						if (tempEvt.sendEventName) { finalArgs = [eventName]; }

						// Call the callback
						var retVal = tempEvt.call.apply(tempEvt.context || this, finalArgs);

						// If the retVal === true then store the cancel flag and return to the emitting method
						// TO-DO - Make this a constant that can be named
						if (retVal === true) {
							// The receiver method asked us to send a cancel request back to the emitter
							cancelFlag = true;
						}

						// Check if we should now cancel the event
						if (tempEvt.oneShot) {
							// The event has a oneShot flag so since we have fired the event,
							// lets cancel the listener now
							this.off(eventName, tempEvt);
						}
					}

					if (cancelFlag) {
						return 1;
					}

				}

			}
		}
	},

	/**
	 * Remove an event listener.
	 * @param {Boolean} eventName The name of the event you originally registered to listen for.
	 * @param {Object} evtListener The event listener object to cancel.
	 * @return {Boolean}
	 */
	off: function (eventName, evtListener) {
		if (this._eventListeners) {
			if (this._eventListeners[eventName]) {
				// Find this listener in the list
				var evtListIndex = this._eventListeners[eventName].indexOf(evtListener);
				if (evtListIndex > -1) {
					// Remove the listener from the event listender list
					this._eventListeners[eventName].splice(evtListIndex, 1);
					return true;
				}
				this.log('Failed to cancel event listener for event named "' + eventName + '" !', 'info', evtListener);
			} else {
				this.log('Failed to cancel event listener!');
			}
		}

		return false;
	},

	/**
	 * Returns an object containing the current event listeners.
	 * @return {Object}
	 */
	eventList: function () {
		return this._eventListeners;
	}
});

NetIo.Client = NetIo.EventingClass.extend({
	classId: 'Client',

	init: function (url, options) {
		this.log('Net.io client starting...');
		this._options = options || {};
		this._socket = null;
		this._state = 0;
		this._connectionAttempts = 0;

		// Set some default options
		if (this._options.connectionRetry === undefined) { this._options.connectionRetry = true; }
		if (this._options.connectionRetryMax === undefined) { this._options.connectionRetryMax = 10; }
		if (this._options.reconnect === undefined) { this._options.reconnect = true; }

		// If we were passed a url, connect to it
		if (url !== undefined) {
			this.connect(url);
		}
	},

	connect: function (url) {
		this.log('Connecting to server at ' + url);
		var self = this;

		// Set the state to connecting
		this._state = 1;

		// Replace http:// with ws://
		url = url.replace('http://', 'ws://');

		// Create new websocket to the url
		this._socket = new WebSocket(url, 'netio1');

		// Setup event listeners
		this._socket.onopen = function () { self._onOpen.apply(self, arguments); };
		this._socket.onmessage = function () { self._onData.apply(self, arguments); };
		this._socket.onclose = function () { self._onClose.apply(self, arguments); };
		this._socket.onerror = function () { self._onError.apply(self, arguments); };
	},

	disconnect: function (reason) {
		this._socket.close(1000, reason);
	},

	send: function (data) {
		this._socket.send(this._encode(data));
	},

	_onOpen: function () {
		this._state = 2;
	},

	_onData: function (data) {
		// Decode packet and emit message event
		var packet = this._decode(data.data);
		if (packet._netioCmd) {
			// The packet is a netio command
			switch (packet._netioCmd) {
				case 'id':
					// Store the new id in the socket
					this.id = packet.data;

					// Now we have an id, set the state to connected
					this._state = 3;

					// Emit the connect event
					this.emit('connect', this.id);
					break;

				case 'close':
					// The server told us our connection has been closed
					// so store the reason the server gave us!
					this._disconnectReason = packet.data;
					break;
			}
		} else {
			// The packet is normal data
			this.emit('message', [packet]);
		}
	},

	_onClose: function (code, reason, wasClean) {
		// If we are already connected and have an id...
		if (this._state === 3) {
			this._state = 0;
			this.emit('disconnect', {reason: this._disconnectReason, wasClean: wasClean, code:code});
		}

		// If we are connected but have no id...
		if (this._state === 2) {
			this._state = 0;
			this.emit('disconnect', {reason: this._disconnectReason, wasClean: wasClean, code:code});
		}

		// If we were trying to connect...
		if (this._state === 1) {
			this._state = 0;
			this.emit('error', {reason: 'Cannot establish connection, is server running?'});
		}

		// Remove the last disconnect reason
		delete this._disconnectReason;
	},

	_onError: function () {
		this.log('An error occurred with the net.io socket!', 'error', arguments);
		this.emit('error', arguments);
	},

	_encode: function (data) {
		return JSON.stringify(data);
	},

	_decode: function (data) {
		return JSON.parse(data);
	}
});