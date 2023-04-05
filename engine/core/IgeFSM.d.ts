import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
export type TransitionResult = Error | any | Promise<any>;
export type TransitionCheckFunction = (...rest: any[]) => TransitionResult;
export type TransitionPromise = (resolve: (result?: any) => any | Promise<any>) => any | Promise<any>;
export interface TransitionDefinition {
    [fromState: string]: {
        [toState: string]: TransitionCheckFunction;
    };
}
export interface EventDefinition {
    [eventName: string]: (...rest: any[]) => Promise<any>;
}
export interface StateDefinition {
    [stateName: string]: EventDefinition;
}
export interface InitialData {
    states: StateDefinition;
    initialState: string;
}
export declare class IgeFSM extends IgeBaseClass {
    _states: StateDefinition;
    _transitions: TransitionDefinition;
    _transitioning: boolean;
    _initialStateName: string;
    _currentStateName: string;
    _previousStateName: string;
    _transitionQueue: TransitionPromise[];
    _data: {
        [key: string]: any;
    };
    _debug: boolean;
    _log: boolean;
    /**
     * A simple finite state machine implementation.
     */
    constructor(initialData?: InitialData);
    /**
     * Returns the name of the initial state.
     * @returns {string} The name of the initial state.
     */
    initialStateName(): string;
    /**
     * Returns the name of the previous state.
     * @returns {string} The name of the previous state.
     */
    previousStateName(): string;
    /**
     * Returns the name of the current state.
     * @returns {string} The name of the current state.
     */
    currentStateName(): string;
    /**
     * Gets / sets the debug flag. If set to true will enable console logging
     * of state changes / events.
     * @param {boolean=} val Set to true to enable.
     * @returns {boolean|FiniteStateMachine} The debug flag value.
     */
    debug: (val: boolean | undefined) => boolean | this;
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
    defineState: (name: string, definition?: EventDefinition) => this;
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
    defineTransition: (fromState: string, toState: string, transitionCheck: TransitionCheckFunction) => false | this;
    /**
     * After defining your states, call this to set the initial state of the FSM.
     * Setting the state this way skips any transition logic since there is assumed
     * to be no current state and therefore no state to transition from. If the FSM
     * already has a state set, this function will do nothing.
     * @param {String} stateName The state to set as the initial state.
     * @param {any[]} rest Any data you wish to pass the state's "enter" method.
     * @returns {Promise} The result of trying to enter the state.
     */
    initialState: (stateName: string, ...rest: any[]) => Promise<any>;
    /**
     * Gets the state definition object for the specified state name.
     * @param {String} stateName The name of the state whose definition object should
     * be looked up and returned.
     * @returns {Object} The state definition object or undefined if no state exists
     * with that name.
     */
    getState: (stateName: string) => EventDefinition;
    /**
     * Tell the FSM to enter the state specified.
     * @param {String} newStateName The new state to enter.
     * @param {any[]} rest Any data to pass to the exit and enter methods.
     * @returns {Promise<TransitionResult>} The result of entering the state.
     */
    enterState: (newStateName: string, ...rest: any[]) => Promise<TransitionResult>;
    /**
     * Processes the transition queue, taking the first on the queue
     * and calling the transition function, then when that function
     * completes, calls _processTransition again. This continues until
     * the queue is empty.
     * @private
     */
    _processTransition: () => Promise<any>;
    /**
     * Tell the FSM to exit the current state and enter the previous state.
     * @returns {Promise} The exit promise.
     */
    exitState: () => Promise<any>;
    getData(key: string): any;
    setData(key: string, val: any): void;
    /**
     * Raise an event in the current state. If a corresponding event
     * function exists in the current state's definition, it is executed
     * with the passed data as the argument. This is useful when you
     * want to respond to the same event in different ways depending on
     * the current state.
     * @param {string} eventName The name of the event to raise.
     * @param {any[]} rest The optional arguments to pass to the event handler.
     */
    raiseEvent: (eventName: string, ...rest: any[]) => Promise<any> | undefined;
    /**
     * Handles changing states from one to another by checking for transitions and
     * handling return values.
     * @param {String} newStateName The name of the state we are transitioning to.
     * @param {any[]} rest Optional data to pass to the exit and enter methods of each state.
     * @returns {Promise} The promise of the transition result.
     * @private
     */
    _transitionStates: (newStateName: string, ...rest: any[]) => Promise<unknown>;
}
