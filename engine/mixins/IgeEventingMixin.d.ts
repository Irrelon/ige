import type { Mixin } from "@/types/Mixin";
import type { IgeBaseClass } from "../core/IgeBaseClass";
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
export declare const WithEventingMixin: <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) => {
    new (...args: any[]): {
        _eventsProcessing: boolean;
        _eventRemovalQueue: any[];
        _eventListeners?: IgeEventListenerRegister | undefined;
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
         *     var evt = myEntity.on('pointerDown', function () { console.log('down'); });
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
        on(eventName: string | string[], callback: (...args: any) => void, context?: any, oneShot?: boolean, sendEventName?: boolean): IgeEventListenerObject | IgeMultiEventListenerObject | undefined;
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
         *     var evt = myEntity.on('pointerDown', function () { console.log('down'); });
         *
         *     // Switch off event listener
         *     myEntity.off('pointerDown', evt);
         * @return {Boolean}
         */
        off(eventName: string, evtListener: IgeEventListenerObject | IgeMultiEventListenerObject | undefined, callback?: IgeEventRemovalResultCallback): boolean | -1;
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
        emit(eventName: string, args?: any): number;
        /**
         * Returns an object containing the current event listeners.
         * @return {Object}
         */
        eventList(): IgeEventListenerRegister | undefined;
        /**
         * Loops the removals array and processes off() calls for
         * each array item.
         * @private
         */
        _processRemovals(): void;
        classId: string;
        _data: Record<string, any>;
        getClassId(): string;
        log(message: string, ...args: any[]): any;
        logIndent(): void;
        logOutdent(): void;
        data(key: string, value: any): any;
        data(key: string): any;
    };
} & BaseClassType;
