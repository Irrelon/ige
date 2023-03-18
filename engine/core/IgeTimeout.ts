import { ige } from "../instance";
import { IgeInterval, IgeIntervalCallback } from "./IgeInterval";
import type { IgeTimeComponent } from "../components/IgeTimeComponent";

/**
 * Provides an alternative to setTimeout() which works based on the engine's internal
 * time system allowing timeouts to fire correctly, taking into account pausing the
 * game and differences in rendering speed etc.
 */
export class IgeTimeout extends IgeInterval {
	classId = "IgeTimeout";

	/**
	 * Creates a new timeout that will call the passed method after the number of
	 * milliseconds specified by the timeout parameter has been reached.
	 * @param {Function} method The method to call on timeout.
	 * @param {Number} timeout The number of milliseconds before the timeout.
	 */
	constructor (method: IgeIntervalCallback, timeout: number) {
		super(method, timeout);
	}

	/**
	 * Resets the time and lets the timeout begin anew.
	 * @returns {*}
	 */
	reset () {
		this._time = 0;
		if ((ige.engine.components.time as IgeTimeComponent)._timers.indexOf(this) === -1) {
			(ige.engine.components.time as IgeTimeComponent).addTimer(this);
		}
	}

	/**
	 * Checks for a timeout event to see if we should call the timeout method. This is
	 * called automatically by the IgeTimeComponent class and does not need to be
	 * called manually.
	 * @returns {*}
	 */
	update () {
		let intendedTime;
		const overTime = this._time - this._interval;

		if (overTime > 0) {
			intendedTime = ige.engine._currentTime - overTime;

			// Fire an interval
			this._method(ige.engine._currentTime, intendedTime);
			(ige.engine.components.time as IgeTimeComponent).removeTimer(this);
		}

		return this;
	}
}
