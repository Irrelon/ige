import { IgeBaseClass } from "./IgeBaseClass";
import { IgeEventReturnFlag } from "@/enums/IgeEventReturnFlag";
export type IgeEventListenerCallback = (...args: any[]) => boolean | undefined | void;
export interface IgeEventStaticEmitterObject {
    id: string;
    args: any[];
}
/**
 * Creates a new class with the capability to emit events.
 */
export declare class IgeEventingClass extends IgeBaseClass {
    _eventsEmitting: boolean;
    _eventsProcessing: boolean;
    _eventRemovalQueue: any[];
    _eventListeners?: Record<string, Record<string, IgeEventListenerCallback[]>>;
    _eventStaticEmitters: Record<string, IgeEventStaticEmitterObject[]>;
    _eventsAllowDefer: boolean;
    _eventsDeferTimeouts: Record<any, number>;
    /**
     * Attach an event listener to the passed event only if the passed
     * id matches the id for the event being fired.
     * @param {string} eventName The name of the event to listen for.
     * @param {string} id The id to match against.
     * @param {function} listener The method to call when the event is fired.
     * @returns {IgeEventingClass} The emitter instance.
     */
    _on(eventName: string, id: string, listener: IgeEventListenerCallback): this;
    /**
     * Attach an event listener to the passed event only if the passed
     * id matches the document id for the event being fired.
     * @param {String} eventName The name of the event to listen for.
     * @param {*} id The id to match against.
     * @param {Function} listener The method to call when the event is fired.
     * @returns {IgeEventingClass} The emitter instance.
     */
    _once(eventName: string, id: string, listener: IgeEventListenerCallback): this;
    /**
     * Cancels an event listener based on an event name, id and listener function.
     * @param {String} eventName The event to cancel listener for.
     * @param {String} id The ID of the event to cancel listening for.
     * @param {Function} listener The event listener function used in the on()
     * or once() call to cancel.
     * @returns {IgeEventingClass} The emitter instance.
     */
    _off(eventName: string, id: string, listener?: IgeEventListenerCallback): this;
    /**
     * Attach an event listener to the passed event only if the passed
     * id matches the document id for the event being fired.
     * @param {String} eventName The name of the event to listen for.
     * @param {*} id The id to match against.
     * @param {Function} listener The method to call when the event is fired.
     * @returns {IgeEventingClass} The emitter instance.
     */
    on(eventName: string, id: string, listener: IgeEventListenerCallback): this;
    on(eventName: string, listener: IgeEventListenerCallback): this;
    /**
     * Attach an event listener to the passed event only if the passed
     * id matches the document id for the event being fired.
     * @param {String} eventName The name of the event to listen for.
     * @param id The id to match against.
     * @param listener
     * @returns {IgeEventingClass} The emitter instance.
     */
    once(eventName: string, id: string, listener: IgeEventListenerCallback): this;
    once(eventName: string, listener: IgeEventListenerCallback): this;
    /**
     * Overwrites any previous event listeners so that if the event fires, only
     * the listener you pass will be called. If you pass an id along with the
     * listener, only listeners for the id will be overwritten. This is similar
     * to calling `.off(eventName)` then `on(eventName, listener)` since
     * `off(eventName)` will cancel any previous event listeners for the passed
     * event name.
     * @param {String} eventName The name of the event to listen for.
     * @param {*} id The id to match against.
     * @param {Function} listener The method to call when the event is fired.
     * @returns {IgeEventingClass} The emitter instance.
     */
    overwrite(eventName: string, id: string, listener: IgeEventListenerCallback): this;
    overwrite(eventName: string, listener: IgeEventListenerCallback): this;
    /**
     * Cancels an event listener based on an event name, id and listener function.
     * @param {String} eventName The event to cancel listener for.
     * @param {String} id The ID of the event to cancel listening for.
     * @param {Function} listener The event listener function used in the on()
     * or once() call to cancel.
     * @returns {IgeEventingClass} The emitter instance.
     */
    off(eventName: string, id: string, listener?: IgeEventListenerCallback): this;
    off(eventName: string, listener?: IgeEventListenerCallback): this;
    off(eventName: string): this;
    /**
     * Emit an event by name.
     * @param {Object} eventName The name of the event to emit.
     * @param {...any} data The arguments to send to any listening methods.
     * If you are sending multiple arguments, separate them with a comma so
     * that they are received by the function as separate arguments.
     * @return {number}
     * @example #Emit an Event
     *     // Emit the event named "hello"
     *     myEntity.emit('hello');
     * @example #Emit an Event With Data Object
     *     // Emit the event named "hello"
     *     myEntity.emit('hello', {moo: true});
     * @example #Emit an Event With Multiple Data Values
     *     // Emit the event named "hello"
     *     myEntity.emit('hello', {moo: true}, 'someString');
     * @example #Listen for Event Data
     *     // Set a listener to listen for the data (multiple values emitted
     *     // from an event are passed as function arguments)
     *     myEntity.on('hello', function (arg1, arg2) {
     *         console.log(arg1, arg2);
     *     }
     *
     *     // Emit the event named "hello"
     *     myEntity.emit('hello', 'data1', 'data2');
     *
     *     // The console output is:
     *     //    data1, data2
     */
    emit(eventName: string, ...data: any[]): IgeEventReturnFlag;
    emitId(eventName: string, id: string, ...data: any[]): this;
    /**
     * Handles emitting events, is an internal method not called directly.
     * @param {String} eventName The name of the event to emit.
     * @param {...any} data Optional arguments to emit with the event.
     * @returns {IgeEventingClass} The emitter instance.
     * @private
     */
    emitStatic(eventName: string, ...data: any[]): this;
    /**
     * Handles emitting events, is an internal method not called directly.
     * @param {String} eventName The name of the event to emit.
     * @param {String} id The id of the event to emit.
     * @param {...any} data Optional arguments to emit with the event.
     * @returns {IgeEventingClass} The emitter instance.
     * @private
     */
    emitStaticId(eventName: string, id: string, ...data: any[]): this;
    /**
     * Handles removing emitters, is an internal method not called directly.
     * @param {String} eventName The event to remove static emitter for.
     * @returns {IgeEventingClass} The emitter instance.
     * @private
     */
    cancelStatic(eventName: string): this;
    /**
     * Checks if an event has any event listeners or not.
     * @param {String} eventName The name of the event to check for.
     * @returns {boolean} True if one or more event listeners are registered for
     * the event. False if none are found.
     */
    willEmit(eventName: string): boolean;
    /**
     * Checks if an event has any event listeners or not based on the passed id.
     * @param {String} eventName The name of the event to check for.
     * @param {String} id The event ID to check for.
     * @returns {boolean} True if one or more event listeners are registered for
     * the event. False if none are found.
     */
    willEmitId(eventName: string, id: string): boolean;
    /**
     * Queues an event to be fired. This has automatic de-bouncing so that any
     * events of the same type that occur within 100 milliseconds of a previous
     * one will all be wrapped into a single emit rather than emitting tons of
     * events for lots of chained inserts etc. Only the data from the last
     * de-bounced event will be emitted.
     * @param {String} eventName The name of the event to emit.
     * @param {...any} data Optional arguments to emit with the event.
     * @returns {IgeEventingClass} The emitter instance.
     */
    deferEmit(eventName: string, ...data: any[]): this;
    /**
     * If events are cleared with the off() method while the event emitter is
     * actively processing any events then the off() calls get added to a
     * queue to be executed after the event emitter is finished. This stops
     * errors that might occur by potentially modifying the event queue while
     * the emitter is running through them. This method is called after the
     * event emitter is finished processing.
     * @private
     */
    _processRemovalQueue(): void;
}
