/**
 * Creates a new class with the capability to emit events.
 */
var IgeEventingClass = IgeClass.extend({
	classId: 'IgeEventingClass',

	/**
	 * Add an event listener method for an event.
	 * @param {String || Array} eventName The name of the event to listen for (string), or an array of events to listen for.
	 * @param {Function} call The method to call when the event listener is triggered.
	 * @param {Object=} context The context in which the call to the listening method will be made (sets the 'this' variable in the method to the object passed as this parameter).
	 * @param {Boolean=} oneShot If set, will instruct the listener to only listen to the event being fired once and will not fire again.
	 * @param {Boolean=} sendEventName If set, will instruct the emitter to send the event name as the argument instead of any emitted arguments.
	 * @return {Object} The event listener object. Hold this value if you later want to turn off the event listener.
	 * @example #Add an Event Listener
	 *     // Register event lister and store in "evt"
	 *     var evt = myEntity.on('mouseDown', function () { console.log('down'); });
	 * @example #Listen for Event Data
	 *     // Set a listener to listen for the data (multiple values emitted
	 *     // from an event are passed as function arguments)
	 *     myEntity.on('hello', function (arg1, arg2) {
	 *         console.log(arg1, arg2);
	 *     }
	 *     
	 *     // Emit the event named "hello"
	 *     myEntity.emit('hello', ['data1', 'data2']);
	 *     
	 *     // The console output is:
	 *     //    data1, data2
	 */
	on: function (eventName, call, context, oneShot, sendEventName) {
		var self = this,
			newListener,
			addListener,
			existingIndex,
			elArr,
			multiEvent,
			eventIndex,
			eventData,
			eventObj,
			multiEventName,
			i;

		// Check that we have an event listener object
		this._eventListeners = this._eventListeners || {};

		if (typeof call === 'function') {
			if (typeof eventName === 'string') {
				// Compose the new listener
				newListener = {
					call: call,
					context: context,
					oneShot: oneShot,
					sendEventName: sendEventName
				};

				elArr = this._eventListeners[eventName] = this._eventListeners[eventName] || [];

				// Check if we already have this listener in the list
				addListener = true;

				// TO-DO - Could this do with using indexOf? Would that work? Would be faster?
				existingIndex = elArr.indexOf(newListener);
				if (existingIndex > -1) {
					addListener = false;
				}

				// Add this new listener
				if (addListener) {
					elArr.push(newListener);
				}

				return newListener;
			} else {
				// The eventName is an array of names, creating a group of events
				// that must be fired to fire this event callback
				if (eventName.length) {
					// Loop the event array
					multiEvent = [];
					multiEvent[0] = 0; // This will hold our event count total
					multiEvent[1] = 0; // This will hold our number of events fired

					// Define the multi event callback
					multiEvent[3] = function (firedEventName) {
						multiEvent[1]++;

						if (multiEvent[0] === multiEvent[1]) {
							// All the multi-event events have fired
							// so fire the callback
							call.apply(context || self);
						}
					};

					for (eventIndex in eventName) {
						if (eventName.hasOwnProperty(eventIndex)) {
							eventData = eventName[eventIndex];
							eventObj = eventData[0];
							multiEventName = eventData[1];

							// Increment the event listening count total
							multiEvent[0]++;

							// Register each event against the event object with a callback
							eventObj.on(multiEventName, multiEvent[3], null, true, true);
						}
					}
				}
			}
		} else {
			if (typeof(eventName) !== 'string') {
				eventName = '*Multi-Event*';
			}
			this.log('Cannot register event listener for event "' + eventName + '" because the passed callback is not a function!', 'error');
		}
	},
	
	/**
	 * Remove an event listener. If the _processing flag is true
	 * then the removal will be placed in the removals array to be
	 * processed after the event loop has completed in the emit()
	 * method.
	 * @param {Boolean} eventName The name of the event you originally registered to listen for.
	 * @param {Object} evtListener The event listener object to cancel. This object is the one
	 * returned when calling the on() method. It is NOT the method you passed as the second argument
	 * to the on() method.
	 * @param {Function} callback The callback method to call when the event listener has been
	 * successfully removed. If you attempt to remove a listener during the event firing loop
	 * then the listener will not immediately be removed but will be queued for removal before
	 * the next listener loop is fired. In this case you may like to be informed via callback
	 * when the listener has been fully removed in which case, provide a method for this argument.
	 * 
	 * The callback will be passed a single boolean argument denoting if the removal was successful
	 * (true) or the listener did not exist to remove (false).
	 * @example #Switch off an Event Listener
	 *     // Register event lister and store in "evt"
	 *     var evt = myEntity.on('mouseDown', function () { console.log('down'); });
	 *     
	 *     // Switch off event listener
	 *     myEntity.off('mouseDown', evt);
	 * @return {Boolean}
	 */
	off: function (eventName, evtListener, callback) {
		if (this._eventListeners) {
			if (!this._eventListeners._processing) {
				if (this._eventListeners[eventName]) {
					// Find this listener in the list
					var evtListIndex = this._eventListeners[eventName].indexOf(evtListener);
					if (evtListIndex > -1) {
						// Remove the listener from the event listener list
						this._eventListeners[eventName].splice(evtListIndex, 1);
						if (callback) {
							callback(true);
						}
						return true;
					} else {
						this.log('Failed to cancel event listener for event named "' + eventName + '" !', 'warning', evtListener);
					}
				} else {
					this.log('Failed to cancel event listener!');
				}
			} else {
				// Add the removal to a remove queue since we are processing
				// listeners at the moment and removing one would mess up the
				// loop!
				this._eventListeners._removeQueue = this._eventListeners._removeQueue || [];
				this._eventListeners._removeQueue.push([eventName, evtListener, callback]);

				return -1;
			}
		}

		if (callback) {
			callback(false);
		}
		return false;
	},

	/**
	 * Emit an event by name.
	 * @param {Object} eventName The name of the event to emit.
	 * @param {Object || Array} args The arguments to send to any listening methods.
	 * If you are sending multiple arguments, use an array containing each argument.
	 * @return {Number}
	 * @example #Emit an Event
	 *     // Emit the event named "hello"
	 *     myEntity.emit('hello');
	 * @example #Emit an Event With Data Object
	 *     // Emit the event named "hello"
	 *     myEntity.emit('hello', {moo: true});
	 * @example #Emit an Event With Multiple Data Values
	 *     // Emit the event named "hello"
	 *     myEntity.emit('hello', [{moo: true}, 'someString']);
	 * @example #Listen for Event Data
	 *     // Set a listener to listen for the data (multiple values emitted
	 *     // from an event are passed as function arguments)
	 *     myEntity.on('hello', function (arg1, arg2) {
	 *         console.log(arg1, arg2);
	 *     }
	 *     
	 *     // Emit the event named "hello"
	 *     myEntity.emit('hello', ['data1', 'data2']);
	 *     
	 *     // The console output is:
	 *     //    data1, data2
	 */
	emit: function (eventName, args) {
		if (this._eventListeners) {
			// Check if the event has any listeners
			if (this._eventListeners[eventName]) {

				// Fire the listeners for this event
				var eventCount = this._eventListeners[eventName].length,
					eventCount2 = this._eventListeners[eventName].length - 1,
					finalArgs, i, cancelFlag, eventIndex, tempEvt, retVal;

				// If there are some events, ensure that the args is ready to be used
				if (eventCount) {
					finalArgs = [];
					if (typeof(args) === 'object' && args !== null && args[0] !== null && args[0] !== undefined) {
						for (i in args) {
							if (args.hasOwnProperty(i)) {
								finalArgs[i] = args[i];
							}
						}
					} else {
						finalArgs = [args];
					}

					// Loop and emit!
					cancelFlag = false;

					this._eventListeners._processing = true;
					while (eventCount--) {
						eventIndex = eventCount2 - eventCount;
						tempEvt = this._eventListeners[eventName][eventIndex];


						// If the sendEventName flag is set, overwrite the arguments with the event name
						if (tempEvt.sendEventName) { finalArgs = [eventName]; }

						// Call the callback
						retVal = tempEvt.call.apply(tempEvt.context || this, finalArgs);

						// If the retVal === true then store the cancel flag and return to the emitting method
						if (retVal === true) {
							// The receiver method asked us to send a cancel request back to the emitter
							cancelFlag = true;
						}

						// Check if we should now cancel the event
						if (tempEvt.oneShot) {
							// The event has a oneShot flag so since we have fired the event,
							// lets cancel the listener now
							if (this.off(eventName, tempEvt) === true) {
								eventCount2--;	
							}
						}
					}

					// Check that the array still exists because an event
					// could have triggered a method that destroyed our object
					// which would have deleted the array!
					if (this._eventListeners) {
						this._eventListeners._processing = false;

						// Now process any event removal
						this._processRemovals();
					}

					if (cancelFlag) {
						return 1;
					}

				}

			}
		}
	},

	/**
	 * Returns an object containing the current event listeners.
	 * @return {Object}
	 */
	eventList: function () {
		return this._eventListeners;
	},
	
	/**
	 * Loops the removals array and processes off() calls for
	 * each array item.
	 * @private
	 */
	_processRemovals: function () {
		if (this._eventListeners) {
			var remArr = this._eventListeners._removeQueue,
				arrCount,
				item,
				result;

			// If the removal array exists
			if (remArr) {
				// Get the number of items in the removal array
				arrCount = remArr.length;

				// Loop the array
				while (arrCount--) {
					item = remArr[arrCount];

					// Call the off() method for this item
					result = this.off(item[0], item[1]);

					// Check if there is a callback
					if (typeof remArr[2] === 'function') {
						// Call the callback with the removal result
						remArr[2](result);
					}
				}
			}

			// Remove the removal array
			delete this._eventListeners._removeQueue;
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEventingClass; }