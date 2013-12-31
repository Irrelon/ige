/**
 * A simple finite state machine implementation.
 */
var IgeFSM = IgeClass.extend({
	classId: 'IgeFSM',

	init: function () {
		var self = this;
		
		this._states = {};
		this._transitions = {};

		// Track states by name.
		this._initialStateName = '';
		this._currentStateName = '';
		this._previousStateName = '';
		
		this._debug = false;
	},

	/**
	 * Returns the name of the initial state.
	 * @returns {string}
	 */
	initialStateName: function () {
		return this._currentStateName;
	},

	/**
	 * Returns the name of the previous state.
	 * @returns {string}
	 */
	previousStateName: function () {
		return this._currentStateName;
	},

	/**
	 * Returns the name of the current state.
	 * @returns {string}
	 */
	currentStateName: function () {
		return this._currentStateName;
	},

	/**
	 * Gets / sets the debug flag. If set to true will enable console logging
	 * of state changes / events.
	 * @param {Boolean=} val Set to true to enable.
	 * @returns {*}
	 */
	debug: function (val) {
		if (val !== undefined) {
			this._debug = val;
			return this;
		}
		
		return this._debug;
	},

	/**
	 * Defines a state with a name and a state definition.
	 * @param {String} name The name of the state to define.
	 * @param {Object} definition The state definition object.
	 * @example #Define a state
	 *     var fsm = new IgeFSM();
	 *     
	 *     // Define an "idle" state
	 *     fsm.defineState('idle', {
	 *         enter: function (data, completeCallback) {
	 *             console.log('entered idle state');
	 *             completeCallback();
	 *         },
	 *         exit: function (data, completeCallback) {
	 *             console.log('exited idle state');
	 *             completeCallback();
	 *         }
	 *     });
	 * @returns {IgeFSM}
	 */
	defineState: function (name, definition) {
		this._states[name] = definition;

		if (!this._initialStateName) {
			this._initialStateName = name;
		}
		
		return this;
	},

	/**
	 * Defines a transition between two states.
	 * @param {String} fromState The state name the transition is from.
	 * @param {String} toState The state name the transition is to.
	 * @param {Function} transitionCheck A method to call just before this transition
	 * between the two specified states is executed, that will call the callback method
	 * passed to it in the second parameter and include either true to allow the
	 * transition to continue, or false to cancel it in the first parameter.
	 * @example #Define a state transition
	 *     var fsm = new IgeFSM();
	 *     
	 *     // Define an "idle" state
	 *     fsm.defineState('idle', {
	 *         enter: function (data, completeCallback) {
	 *             console.log('entered idle state');
	 *             completeCallback();
	 *         },
	 *         exit: function (data, completeCallback) {
	 *             console.log('exited idle state');
	 *             completeCallback();
	 *         }
	 *     });
	 *     
	 *     // Define a "moving" state
	 *     fsm.defineState('moving', {
	 *         enter: function (data, completeCallback) {
	 *             console.log('entered moving state');
	 *             completeCallback();
	 *         },
	 *         exit: function (data, completeCallback) {
	 *             console.log('exited moving state');
	 *             completeCallback();
	 *         }
	 *     });
	 *     
	 *     // Define a transition between the two methods
	 *     fsm.defineTransition('idle', 'moving', function (data, callback) {
	 *         // Check some data we were passed
	 *         if (data === 'ok') {
	 *             // Callback the listener and tell them there was no error
	 *             // (first argument is an err flag, set to false for no error)
	 *             callback(false);
	 *         } else {
	 *             // Callback and say there was an error by passing anything other
	 *             // than false in the first argument
	 *             callback('Some error string, or true or any data');
	 *         }
	 *     });
	 *     
	 *     // Now change states and cause it to fail
	 *     fsm.enterState('moving', 'notOk', function (err, data) {
	 *         if (!err) {
	 *             // There was no error, the state changed successfully
	 *             console.log('State changed!', fsm.currentStateName());
	 *         } else {
	 *             // There was an error, the state did not change
	 *             console.log('State did NOT change!', fsm.currentStateName());
	 *         }
	 *     });
	 *     
	 *     // Now change states and pass "ok" in the data to make it proceed
	 *     fsm.enterState('moving', 'ok', function (err, data) {
	 *         if (!err) {
	 *             // There was no error, the state changed successfully
	 *             console.log('State changed!', fsm.currentStateName());
	 *         } else {
	 *             // There was an error, the state did not change
	 *             console.log('State did NOT change!', fsm.currentStateName());
	 *         }
	 *     });
	 * @returns {*}
	 */
	defineTransition: function (fromState, toState, transitionCheck) {
		if (fromState && toState && transitionCheck) {
			if (!this._states[fromState]) {
				this.log('fromState "' + fromState + '" specified is not defined as a state!', 'error');
			}
	
			if (!this._states[toState]) {
				this.log('toState "' + toState + '" specified is not defined as a state!', 'error');
			}
	
			this._transitions[fromState] = this._transitions[fromState] || {};
			this._transitions[fromState][toState] = transitionCheck;
			
			return this;
		}
		
		return false;
	},

	/**
	 * After defining your states, call this with the state name and the initial
	 * state of the FSM will be set.
	 * @param {String} stateName The state to set as the initial state.
	 * @param {*=} data Any data you wish to pass the state's "enter" method.
	 * @param {Function=} callback An optional callback method that will be called
	 * once the state has been entered successfully, or if there was an error.
	 */
	initialState: function (stateName, data, callback) {
		var newStateObj = this.getState(stateName);
		
		this._currentStateName = stateName;
		
		if (this._debug) { this.log('Entering initial state: ' + stateName); }
		
		if (newStateObj.enter) {
			newStateObj.enter.apply(newStateObj, [data, function (enterErr, enterData) {
				if (callback) { callback(enterErr, enterData); }
			}]);
		}
	},

	/**
	 * Gets the state definition object for the specified state name.
	 * @param {String} stateName The name of the state who's definition object should
	 * be looked up and returned.
	 * @returns {Object} The state definition object or undefined if no state exists
	 * with that name.
	 */
	getState: function (stateName) {
		return this._states[stateName];
	},

	/**
	 * Tell the FSM to enter the state specified.
	 * @param {String} newStateName The new state to enter.
	 * @param {*} data Any data to pass to the exit and enter methods.
	 * @param {Function=} callback The optional callback method to call on completion.
	 */
	enterState: function (newStateName, data, callback) {
		var self = this;
		
		if (self._transitions[self._currentStateName] && self._transitions[self._currentStateName][newStateName]) {
			// There is a transition check method, call it to see if we can change states
			self._transitions[self._currentStateName][newStateName](data, function (err) {
				if (!err) {
					// State change allowed
					self._transitionStates(self._currentStateName, newStateName, data, callback);
				} else {
					// State change not allowed or error
					if (callback ) { callback(err); }
					
					this.log('Cannot transition from "' + self._currentStateName + '" to "' + newStateName + '" states.', 'warning');
				}
			});
		} else {
			// No transition check method exists, continue to change states
			self._transitionStates(self._currentStateName, newStateName, data, callback);
		}
	},

	/**
	 * Tell the FSM to exit the current state and enter the previous state.
	 * @param {Function=} callback Optional callback method once exiting the state
	 * has been executed.
	 */
	exitState: function (callback) {
		this.enterState(this._previousStateName, null, callback);
	},

	/**
	 * Handles changing states from one to another by checking for transitions and
	 * handling callbacks.
	 * @param {String} oldStateName The name of the state we are transitioning from.
	 * @param {String} newStateName The name of the state we are transitioning to.
	 * @param {*=} data Optional data to pass to the exit and enter methods of each state.
	 * @param {Function=} callback Optional callback method to execute once the transition
	 * has been completed.
	 * @private
	 */
	_transitionStates: function (oldStateName, newStateName, data, callback) {
		var self = this,
			currentStateObj = self.getState(self._currentStateName),
			newStateObj = self.getState(newStateName);
		
		if (currentStateObj && newStateObj) {
			if (self._debug) { self.log('Exiting state: ' + self._currentStateName); }
			if (currentStateObj.exit) {
				currentStateObj.exit.apply(currentStateObj, [data, function (exitStateErr, exitStateData) {
					self._previousStateName = self._currentStateName;
					self._currentStateName = newStateName;
					
					if (self._debug) { self.log('Entering state: ' + newStateName); }
					if (newStateObj.enter) {
						newStateObj.enter.apply(newStateObj, [data, function (enterStateErr, enterStateData) {
							if (callback) { callback(enterStateErr, data); }
						}]);
					}
				}]);
			}
		} else {
			if (callback) { callback('Cannot change states from "' + self._currentStateName + '" to "' + newStateName + '" states.'); }
			self.log('Cannot change states from "' + self._currentStateName + '" to "' + newStateName + '" states.', 'warning');
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeFSM; }