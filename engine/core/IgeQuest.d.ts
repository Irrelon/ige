import { IgeEventingClass } from "./IgeEventingClass";
export declare class IgeQuest extends IgeEventingClass {
    classId: string;
    constructor(questDefinition: any, completeCallback: any);
    /**
     * Gets / sets the callback method that will fire when
     * the quest has been completed.
     * @param callback
     * @return {*}
     */
    complete(callback: any): any;
    /**
     * Gets / sets the flag that determines if the quest
     * has been completed successfully or not.
     * @param val
     * @return {*}
     */
    isComplete(val: any): any;
    /**
     * Gets / sets the flag that determines if the quest items
     * need to be completed in order (true) or if they can be
     * completed in any order (false). Default is false.
     * @param val
     * @return {*}
     */
    linear(val: any): any;
    /**
     * Gets / sets the items array containing the quest item
     * definition objects.
     * @param val
     * @return {*}
     */
    items(val: any): any;
    /**
     * Returns the number of quest items this quest has.
     * @return {Number}
     */
    itemCount(): any;
    /**
     * Returns the sum of all event counts for every item
     * in the quest giving an overall number of events that
     * need to fire in order for the quest to be completed.
     * @return {Number}
     */
    eventCount(): any;
    /**
     * Returns the number of events that have been completed.
     * @return {Number}
     */
    eventCompleteCount(): any;
    /**
     * Returns the number of items that have been completed.
     * @return {Number}
     */
    itemCompleteCount(): any;
    /**
     * Returns the percentage representation of the quest's
     * overall completion based on number of overall events and
     * number of events that have been completed.
     * @return {Number} A number from zero to one-hundred.
     */
    percentComplete(): number;
    /**
     * Starts the quest by setting up the quest event
     * listeners.
     */
    start(): this;
    /**
     * Stops the quest and sets all the event listeners to
     * ignore events until the quest is restarted.
     */
    stop(): this;
    /**
     * Resets the quest and item internals back to their
     * original values and cancels all current event listeners.
     */
    reset(): this;
    /**
     * Sets up a quest item's event listener.
     * @param item
     * @private
     */
    _setupItemListener(item: any): void;
    /**
     * Handles when an event has been fired for a quest item.
     * @param item
     * @private
     */
    _eventComplete(item: any): void;
    /**
     * Handles when an item's events have all been fired.
     * @param item
     * @private
     */
    _itemComplete(item: any): void;
    /**
     * Called when a quest item has been completed to determine
     * if the quest should continue or if it has also been
     * completed.
     * @private
     */
    _update(): void;
}
