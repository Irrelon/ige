var IgeEventingClass = IgeClass.extend({
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

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEventingClass; }