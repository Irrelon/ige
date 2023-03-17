import type {Mixin} from "../../types/Mixin";
import type IgeBaseClass from "../core/IgeBaseClass";

export interface IgeEventListenerObject {
	type: "single";
	callback: (...args: any) => boolean | void;
	context: any;
	oneShot: boolean;
	sendEventName: boolean;
}

export interface IgeMultiEventListenerObject extends Omit<IgeEventListenerObject, "type"> {
	type: "multi";
	handler: (firedEventName: string) => boolean | void;
	eventsFired: number;
	totalEvents: number;
}

export type IgeEventListenerRegister = Record<string, IgeEventListenerObject[]>;

export type IgeEventRemovalResultCallback = (success: boolean) => void;


const WithEventingMixin = <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) => class extends Base {
	// Private
	_eventsProcessing: boolean = false;
	_eventRemovalQueue: any[] = [];
	_eventListeners?: IgeEventListenerRegister = {};

	/**
	 * Add an event listener method for an event.
	 * @param {String || Array} eventName The name of the event to listen for (string), or an array of events to listen for.
	 * @param {Function} callback The method to call when the event listener is triggered.
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
	on (eventName: string | string[], callback: (...args: any) => void, context?: any, oneShot = false, sendEventName = false) {
		// Check that we have an event listener object
		this._eventListeners = this._eventListeners || {};

		if (typeof callback !== "function") {
			if (typeof eventName !== "string") {
				eventName = "*Multi-Event*";
			}
			this.log("Cannot register event listener for event \"" + eventName + "\" because the passed callback is not a function!", "error");
		}

		if (typeof eventName === "string") {
			// Compose the new listener
			const newListener: IgeEventListenerObject = {
				type: "single",
				callback,
				context,
				oneShot,
				sendEventName
			};

			const elArr: IgeEventListenerObject[] = this._eventListeners[eventName] = this._eventListeners[eventName] || [];

			const existingIndex = elArr.findIndex((tmpListener) => {
				return tmpListener.callback === newListener.callback;
			});

			if (existingIndex === -1) {
				// The listener does not already exist, add it
				elArr.push(newListener);
			}

			return newListener;
		}

		if (!eventName.length) {
			return;
		}

		// The eventName is an array of names, creating a group of events
		// that must be fired to fire this event callback
		const multiEventListener: IgeMultiEventListenerObject = {
			type: "multi",
			callback,
			context,
			oneShot,
			sendEventName,
			eventsFired: 0,
			totalEvents: 0,
			handler: (firedEventName: string) => {
				multiEventListener.eventsFired++;

				if (multiEventListener.totalEvents === multiEventListener.eventsFired) {
					// All the multi-event events have fired
					// so fire the callback
					callback.apply(context || this);
				}
			}
		};

		eventName.forEach((multiEventName) => {
			// Increment the event listening count total
			multiEventListener.totalEvents++;

			// Register each event against the event object with a callback
			this.on(multiEventName, multiEventListener.handler, null, true, true);
		});

		return multiEventListener;
	}

	/**
	 * Remove an event listener. If the _processing flag is true
	 * then the removal will be placed in the removals array to be
	 * processed after the event loop has completed in the emit()
	 * method.
	 * @param {string} eventName The name of the event you originally registered to listen for.
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
	off (eventName: string, evtListener: IgeEventListenerObject | IgeMultiEventListenerObject | undefined, callback?: IgeEventRemovalResultCallback) {
		if (!evtListener) return false;

		if (this._eventListeners) {
			if (!this._eventListeners._processing) {
				if (this._eventListeners[eventName]) {
					// Find this listener in the list
					const evtListIndex = this._eventListeners[eventName].indexOf(evtListener);
					if (evtListIndex > -1) {
						// Remove the listener from the event listener list
						this._eventListeners[eventName].splice(evtListIndex, 1);
						if (callback) {
							callback(true);
						}
						return true;
					} else {
						this.log("Failed to cancel event listener for event named \"" + eventName + "\" !", "warning", evtListener);
					}
				} else {
					this.log("Failed to cancel event listener!");
				}
			} else {
				// Add the removal to a remove queue since we are processing
				// listeners at the moment and removing one would mess up the
				// loop!
				this._eventRemovalQueue = this._eventRemovalQueue || [];
				this._eventRemovalQueue.push([eventName, evtListener, callback]);

				return -1;
			}
		}

		if (callback) {
			callback(false);
		}
		return false;
	}

	/**
	 * Emit an event by name.
	 * @param {Object} eventName The name of the event to emit.
	 * @param {Object || Array} [args] The arguments to send to any listening methods.
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
	emit (eventName: string, args?: any): number {
		if (!this._eventListeners) {
			return 0;
		}

		// Check if the event has any listeners
		if (!this._eventListeners[eventName]) {
			return 0;
		}

		// Fire the listeners for this event
		let eventCount = this._eventListeners[eventName].length;
		let eventCount2 = this._eventListeners[eventName].length - 1;

		// If there are some events, ensure that the args is ready to be used
		if (!eventCount) {
			return 0;
		}

		let finalArgs: any[] = [];

		if (typeof (args) === "object" && args !== null && args[0] !== null && args[0] !== undefined) {
			args.forEach((arg: any, argIndex: number) => {
				finalArgs[argIndex] = arg;
			});
		} else {
			finalArgs = [args];
		}

		// Loop and emit!
		let cancelFlag = false;

		this._eventsProcessing = true;

		while (eventCount--) {
			const tempEvt = this._eventListeners[eventName][eventCount];
			if (!tempEvt) debugger;
			// If the sendEventName flag is set, overwrite the arguments with the event name
			if (tempEvt.sendEventName) {
				finalArgs = [eventName];
			}

			// Call the callback
			const retVal = tempEvt.callback.apply(tempEvt.context || this, finalArgs);

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
			this._eventsProcessing = false;

			// Now process any event removal
			this._processRemovals();
		}

		if (cancelFlag) {
			return 1;
		}

		return 0;
	}

	/**
	 * Returns an object containing the current event listeners.
	 * @return {Object}
	 */
	eventList () {
		return this._eventListeners;
	}

	/**
	 * Loops the removals array and processes off() calls for
	 * each array item.
	 * @private
	 */
	_processRemovals () {
		if (!this._eventListeners) {
			return;
		}

		const remArr = this._eventRemovalQueue;

		// If the removal array exists
		if (remArr) {
			// Get the number of items in the removal array
			let arrCount = remArr.length;

			// Loop the array
			while (arrCount--) {
				const item = remArr[arrCount];

				// Call the off() method for this item
				const result = this.off(item[0], item[1]);

				// Check if there is a callback
				if (typeof remArr[2] === "function") {
					// Call the callback with the removal result
					remArr[2](result);
				}
			}
		}

		// Remove the removal array
		this._eventRemovalQueue = [];
	}
}

export default WithEventingMixin;
