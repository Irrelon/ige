import { IgeEventingClass } from "./IgeEventingClass.js"
export type IgeIntervalCallback = (...args: any[]) => void;
/**
 * Provides a kind of setInterval() that works based on the engine's internal
 * time system allowing intervals to fire correctly, taking into account pausing
 * the game and differences in rendering speed etc.
 */
export declare class IgeInterval extends IgeEventingClass {
    classId: string;
    _method: IgeIntervalCallback;
    _interval: number;
    _time: number;
    _started: number;
    _catchup: boolean;
    /**
     * Creates a new timer that will call the method every given number of
     * milliseconds specified by the interval parameter.
     * @param {Function} method The method to call each interval.
     * @param {number} interval The number of milliseconds between each interval.
     * @param {Boolean} catchup If true, the interval will fire multiple times
     * retrospectively when the engine jumps in time. If false, the interval will
     * only fire a single time even if a large period of engine time has elapsed.
     */
    constructor(method: IgeIntervalCallback, interval: number, catchup?: boolean);
    /**
     * Adds time to the timer's internal clock.
     * @param {number} time The time in milliseconds to add to the timer's internal clock.
     * @returns {*}
     */
    addTime(time: number): this;
    /**
     * Cancels the timer stopping all future method calls.
     * @returns {*}
     */
    cancel(): this;
    /**
     * Checks for a timer event to see if we should call the timer method. This is
     * called automatically by the IgeTimeController class and does not need to be
     * called manually.
     * @returns {*}
     */
    update(): this;
}
