"use strict";
var __awaiter =
	(this && this.__awaiter) ||
	function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
				? value
				: new P(function (resolve) {
						resolve(value);
				  });
		}
		return new (P || (P = Promise))(function (resolve, reject) {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeFSM = void 0;
const IgeBaseClass_1 = require("./IgeBaseClass.js");
class IgeFSM extends IgeBaseClass_1.IgeBaseClass {
	/**
	 * A simple finite state machine implementation.
	 */
	constructor(initialData) {
		super();
		/**
		 * Gets / sets the debug flag. If set to true will enable console logging
		 * of state changes / events.
		 * @param {boolean=} val Set to true to enable.
		 * @returns {boolean|FiniteStateMachine} The debug flag value.
		 */
		this.debug = (val) => {
			if (val !== undefined) {
				this._debug = val;
				return this;
			}
			return this._debug;
		};
		/**
		 * Defines a state with a name and a state definition.
		 * @param {string} name The name of the state to define.
		 * @param {EventDefinition} definition The state definition object.
		 * @example #Define a state
		 *     var fsm = new FSM();
		 *
		 *     // Define an "idle" state
		 *     fsm.defineState('idle', {
		 *         enter = async (data) => {
		 *             console.log("entered idle state");
		 *             return;
		 *         },
		 *         exit = async (data) => {
		 *             console.log("exited idle state");
		 *             return;
		 *         }
		 *     });
		 * @returns {FiniteStateMachine} The FSM instance.
		 */
		this.defineState = (name, definition = {}) => {
			this._states[name] = definition;
			if (!this._initialStateName) {
				this._initialStateName = name;
			}
			return this;
		};
		/**
		 * Defines a transition between two states.
		 * @param {string} fromState The state name the transition is from.
		 * @param {String} toState The state name the transition is to.
		 * @param {Function} transitionCheck A method to call just before this transition
		 * between the two specified states is executed. The function should be async and
		 * return either an Error instance (new Error()) to indicate the transition should
		 * be cancelled, or any other value to indicate success.
		 * @example #Define a state transition
		 *     var fsm = new FSM();
		 *
		 *     // Define an "idle" state
		 *     fsm.defineState('idle', {
		 *         enter = async function (data) {
		 *             console.log("entered idle state");
		 *             return;
		 *         },
		 *         exit = async function (data) {
		 *             console.log("exited idle state");
		 *             return;
		 *         }
		 *     });
		 *
		 *     // Define a "moving" state
		 *     fsm.defineState('moving', {
		 *         enter = async function (data) {
		 *             console.log("entered moving state");
		 *             return;
		 *         },
		 *         exit = async function (data) {
		 *             console.log("exited moving state");
		 *             return;
		 *         }
		 *     });
		 *
		 *     // Define a transition between the two methods
		 *     fsm.defineTransition('idle', 'moving', async (data) => {
		 *         // Check some data we were passed
		 *         if (data === 'ok') {
		 *             return "whatever value you like, objects, arrays, strings, undefined etc";
		 *         } else {
		 *             return new Error("Some error");
		 *         }
		 *     });
		 *
		 *     // Now change states and cause it to fail
		 *     fsm.enterState('moving', {"someData": true}).then((result) => {
		 *         if (result instanceof Error) {
		 *             // There was an error, the state did not change
		 *             console.log('State did NOT change!', fsm.currentStateName());
		 *         } else {
		 *             // There was no error, the state changed successfully
		 *             console.log('State changed!', fsm.currentStateName());
		 *         }
		 *     });
		 *
		 *     // Now change states and pass "ok" in the data to make it proceed
		 *     fsm.enterState('moving', 'ok').then((result) {
		 *         if (result instanceof Error) {
		 *             // There was an error, the state did not change
		 *             console.log('State did NOT change!', fsm.currentStateName());
		 *         } else {
		 *             // There was no error, the state changed successfully
		 *             console.log('State changed!', fsm.currentStateName());
		 *         }
		 *     });
		 * @returns {FiniteStateMachine|Boolean} The FSM instance.
		 */
		this.defineTransition = (fromState, toState, transitionCheck) => {
			if (fromState && toState && transitionCheck) {
				if (!this._states[fromState]) {
					this.log(`fromState "${fromState}" specified is not defined as a state!`, "error");
				}
				if (!this._states[toState]) {
					this.log(`toState "${toState}" specified is not defined as a state!`, "error");
				}
				this._transitions[fromState] = this._transitions[fromState] || {};
				this._transitions[fromState][toState] = transitionCheck;
				return this;
			}
			return false;
		};
		/**
		 * After defining your states, call this to set the initial state of the FSM.
		 * Setting the state this way skips any transition logic since there is assumed
		 * to be no current state and therefore no state to transition from. If the FSM
		 * already has a state set, this function will do nothing.
		 * @param {String} stateName The state to set as the initial state.
		 * @param {any[]} rest Any data you wish to pass the state's "enter" method.
		 * @returns {Promise} The result of trying to enter the state.
		 */
		this.initialState = (stateName, ...rest) => {
			return new Promise((resolve) => {
				if (this._currentStateName) {
					resolve(undefined);
					return;
				}
				const newStateObj = this.getState(stateName);
				if (!newStateObj) throw new Error(`Cannot set initial state "${stateName}" because it does not exist!`);
				// Update the current state
				this._currentStateName = stateName;
				if (this._debug) {
					this.log(`Entering initial state: ${stateName}`);
				}
				if (newStateObj.enter) {
					resolve(newStateObj.enter(...rest));
					return;
				}
				resolve(undefined);
			});
		};
		/**
		 * Gets the state definition object for the specified state name.
		 * @param {String} stateName The name of the state whose definition object should
		 * be looked up and returned.
		 * @returns {Object} The state definition object or undefined if no state exists
		 * with that name.
		 */
		this.getState = (stateName) => {
			return this._states[stateName];
		};
		/**
		 * Tell the FSM to enter the state specified.
		 * @param {String} newStateName The new state to enter.
		 * @param {any[]} rest Any data to pass to the exit and enter methods.
		 * @returns {Promise<TransitionResult>} The result of entering the state.
		 */
		this.enterState = (newStateName, ...rest) => {
			this.log(`Asked to enter state: ${newStateName}`);
			this._transitionQueue.push((resolve) => {
				// Check if we need to do transitions
				if (newStateName === this._currentStateName) {
					this.log(`Already in "${newStateName}" state.`);
					return resolve(undefined);
				}
				this.log(`Checking transition from ${this._currentStateName} to ${newStateName}...`);
				if (
					!this._transitions[this._currentStateName] ||
					!this._transitions[this._currentStateName][newStateName]
				) {
					this.log(`No transition check from ${this._currentStateName} to ${newStateName}`);
					// No transition check method exists, continue to change states
					return resolve(this._transitionStates(newStateName, ...rest));
				}
				// There is a transition check method, call it to see if we can change states
				this._transitions[this._currentStateName][newStateName](...rest).then((result) => {
					if (result instanceof Error) {
						// State change not allowed or error
						this.log(`Cannot transition from "${this._currentStateName}" to "${newStateName}" states.`);
						return resolve(result);
					}
					// State change allowed
					return resolve(this._transitionStates(newStateName, ...rest));
				});
			});
			return this._processTransition();
		};
		/**
		 * Processes the transition queue, taking the first on the queue
		 * and calling the transition function, then when that function
		 * completes, calls _processTransition again. This continues until
		 * the queue is empty.
		 * @private
		 */
		this._processTransition = () =>
			__awaiter(this, void 0, void 0, function* () {
				if (this._transitioning) {
					this.log(`We are already transitioning, returning`);
					return;
				}
				// Check if there are any further transitions to take
				if (!this._transitionQueue.length) {
					this.log(`No further transitions, returning`);
					this._transitioning = false;
					return;
				}
				// Mark the system as transitioning
				this._transitioning = true;
				// Pull the latest async function off the queue
				let func = this._transitionQueue.shift();
				if (!func) {
					func = (resolve) => resolve(undefined);
				}
				// Call the function and wait for resolve
				this.log(`Calling transition function...`);
				return new Promise(func).then(() => {
					this.log(`Transition function finished`);
					// Mark the system as no longer transitioning
					this._transitioning = false;
					// Call processTransition() again
					this.log(`Checking for further transitions...`);
					return this._processTransition();
				});
			});
		/**
		 * Tell the FSM to exit the current state and enter the previous state.
		 * @returns {Promise} The exit promise.
		 */
		this.exitState = () => {
			return this.enterState(this._previousStateName, null);
		};
		/**
		 * Raise an event in the current state. If a corresponding event
		 * function exists in the current state's definition, it is executed
		 * with the passed data as the argument. This is useful when you
		 * want to respond to the same event in different ways depending on
		 * the current state.
		 * @param {string} eventName The name of the event to raise.
		 * @param {any[]} rest The optional arguments to pass to the event handler.
		 */
		this.raiseEvent = (eventName, ...rest) => {
			const beforeAllStateObj = this.getState("beforeAll");
			if (beforeAllStateObj && beforeAllStateObj[eventName]) {
				const eventHandler = beforeAllStateObj[eventName];
				eventHandler(...rest);
			}
			const currentStateObj = this.getState(this._currentStateName);
			let result;
			if (currentStateObj[eventName]) {
				result = currentStateObj[eventName](...rest);
			}
			const afterAllStateObj = this.getState("afterAll");
			if (afterAllStateObj && afterAllStateObj[eventName]) {
				const eventHandler = afterAllStateObj[eventName];
				eventHandler(...rest);
			}
			return result;
		};
		/**
		 * Handles changing states from one to another by checking for transitions and
		 * handling return values.
		 * @param {String} newStateName The name of the state we are transitioning to.
		 * @param {any[]} rest Optional data to pass to the exit and enter methods of each state.
		 * @returns {Promise} The promise of the transition result.
		 * @private
		 */
		this._transitionStates = (newStateName, ...rest) => {
			return new Promise((resolve) => {
				const currentStateObj = this.getState(this._currentStateName);
				const newStateObj = this.getState(newStateName);
				if (!currentStateObj) {
					this.log(`No state defined called ${this._currentStateName}, cannot change states!`);
				}
				if (!newStateObj) {
					this.log(`No state defined called ${newStateName}, cannot change states!`);
				}
				if (!currentStateObj || !newStateObj) {
					return resolve(
						new Error(
							`Cannot change states from "${this._currentStateName}" to "${newStateName}" states because at least one is not defined.`
						)
					);
				}
				if (this._debug) {
					this.log(`Exiting state: ${this._currentStateName}`);
				}
				if (currentStateObj.exit) {
					const exit = currentStateObj.exit;
					exit(...rest).then((exitResult) => {
						if (exitResult instanceof Error) {
							this.log(`Error exiting state: ${this._currentStateName}`);
							return resolve(exitResult);
						}
						this._previousStateName = this._currentStateName;
						this._currentStateName = newStateName;
						if (this._debug) {
							this.log(`Entering state: ${newStateName}`);
						}
						if (newStateObj.enter) {
							const enter = newStateObj.enter;
							enter(...rest).then((enterResult) => {
								return resolve(enterResult);
							});
						}
					});
					return;
				}
				this._previousStateName = this._currentStateName;
				this._currentStateName = newStateName;
				if (this._debug) {
					this.log(`Entering state: ${newStateName}`);
				}
				if (newStateObj.enter) {
					const enter = newStateObj.enter;
					enter(...rest).then((enterResult) => {
						return resolve(enterResult);
					});
				}
			});
		};
		this._states = {};
		this._transitions = {};
		// Track states by name.
		this._initialStateName = "";
		this._currentStateName = "";
		this._previousStateName = "";
		this._transitionQueue = [];
		this._transitioning = false;
		this._data = {};
		this._debug = false;
		this._log = false;
		if (initialData) {
			if (initialData.states) {
				Object.entries(initialData.states).forEach(([stateName, definition]) => {
					this.defineState(stateName, definition);
				});
			}
			if (initialData.initialState) {
				void this.initialState(initialData.initialState);
			}
		}
	}
	/**
	 * Returns the name of the initial state.
	 * @returns {string} The name of the initial state.
	 */
	initialStateName() {
		return this._initialStateName;
	}
	/**
	 * Returns the name of the previous state.
	 * @returns {string} The name of the previous state.
	 */
	previousStateName() {
		return this._previousStateName;
	}
	/**
	 * Returns the name of the current state.
	 * @returns {string} The name of the current state.
	 */
	currentStateName() {
		return this._currentStateName;
	}
	getData(key) {
		return this._data[key];
	}
	setData(key, val) {
		this._data[key] = val;
	}
}
exports.IgeFSM = IgeFSM;
