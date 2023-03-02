/**
 * Provides an alternative to setTimeout() which works based on the engine's internal
 * time system allowing timeouts to fire correctly, taking into account pausing the
 * game and differences in rendering speed etc.
 */
import IgeInterval from "./IgeInterval";

class IgeTimeout extends IgeInterval {
	classId = "IgeTimeout";

	/**
	 * Creates a new timeout that will call the passed method after the number of
	 * milliseconds specified by the timeout parameter has been reached.
	 * @param {Function} method The method to call on timeout.
	 * @param {Number} timeout The number of milliseconds before the timeout.
	 */
	constructor (ige, method, timeout) {
		super(ige, method, timeout);
	}

	/**
	 * Cancels the timer, stops the timeout.
	 * @returns {*}
	 */
	cancel () {
		super.cancel();
	}

	/**
	 * Resets the time and lets the timeout begin anew.
	 * @returns {*}
	 */
	reset () {
		this._time = 0;
		if (this._ige.time._timers.indexOf(this) === -1) {
			this._ige.time.addTimer(this);
		}
	}

	/**
	 * Checks for a timeout event to see if we should call the timeout method. This is
	 * called automatically by the IgeTimeComponent class and does not need to be
	 * called manually.
	 * @returns {*}
	 */
	update () {
		var intendedTime;
		var overTime = this._time - this._interval;

		if (overTime > 0) {
			intendedTime = this._ige._currentTime - overTime;

			// Fire an interval
			this._method(this._ige._currentTime, intendedTime);
			this._ige.time.removeTimer(this);
		}

		return this;
	}
}

export default IgeTimeout;