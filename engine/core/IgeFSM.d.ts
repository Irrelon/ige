import { IgeBaseClass } from "./IgeBaseClass";
/**
 * A simple finite state machine implementation.
 */
export declare class IgeFSM extends IgeBaseClass {
    classId: string;
    constructor();
    /**
     * Returns the name of the initial state.
     * @returns {string}
     */
    initialStateName(): any;
    /**
     * Returns the name of the previous state.
     * @returns {string}
     */
    previousStateName(): any;
    /**
     * Returns the name of the current state.
     * @returns {string}
     */
    currentStateName(): any;
    /**
     * Gets / sets the debug flag. If set to true will enable console logging
     * of state changes / events.
     * @param {Boolean=} val Set to true to enable.
     * @returns {*}
     */
    debug(val: any): any;
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
    defineState(name: any, definition: any): this;
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
    defineTransition(fromState: any, toState: any, transitionCheck: any): false | this;
    /**
     * After defining your states, call this with the state name and the initial
     * state of the FSM will be set.
     * @param {String} stateName The state to set as the initial state.
     * @param {*=} data Any data you wish to pass the state's "enter" method.
     * @param {Function=} callback An optional callback method that will be called
     * once the state has been entered successfully, or if there was an error.
     */
    initialState(stateName: any, data: any, callback: any): void;
    /**
     * Gets the state definition object for the specified state name.
     * @param {String} stateName The name of the state who's definition object should
     * be looked up and returned.
     * @returns {Object} The state definition object or undefined if no state exists
     * with that name.
     */
    getState(stateName: any): any;
    /**
     * Tell the FSM to enter the state specified.
     * @param {String} newStateName The new state to enter.
     * @param {*} data Any data to pass to the exit and enter methods.
     * @param {Function=} callback The optional callback method to call on completion.
     */
    enterState(newStateName: any, data: any, callback: any): void;
    /**
     * Tell the FSM to exit the current state and enter the previous state.
     * @param {Function=} callback Optional callback method once exiting the state
     * has been executed.
     */
    exitState(callback: any): void;
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
    _transitionStates(oldStateName: any, newStateName: any, data: any, callback: any): void;
}
