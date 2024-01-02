import type { IgeIntervalCallback } from "./IgeInterval";
import { IgeInterval } from "./IgeInterval";

/**
 * Provides an alternative to setTimeout() which works based on the engine's internal
 * time system allowing timeouts to fire correctly, taking into account pausing the
 * game and differences in rendering speed etc.
 */
export declare class IgeTimeout extends IgeInterval {
	classId: string;
	/**
	 * Creates a new timeout that will call the passed method after the number of
	 * milliseconds specified by the timeout parameter has been reached.
	 * @param {Function} method The method to call on timeout.
	 * @param {number} timeout The number of milliseconds before the timeout.
	 */
	constructor(method: IgeIntervalCallback, timeout: number);
	/**
	 * Resets the time and lets the timeout begin anew.
	 * @returns {*}
	 */
	reset(): void;
	/**
	 * Checks for a timeout event to see if we should call the timeout method. This is
	 * called automatically by the IgeTimeController class and does not need to be
	 * called manually.
	 * @returns {*}
	 */
	update(): this;
}
