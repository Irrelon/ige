/**
 * Provides an alternative to setInterval() which works based on the engine's internal
 * time system allowing intervals to fire correctly, taking into account pausing the
 * game and differences in rendering speed etc. 
 */
var IgeInterval = IgeEventingClass.extend({
	classId: 'IgeInterval',

	/**
	 * Creates a new timer that will call the method every given number of
	 * milliseconds specified by the interval parameter.
	 * @param {Function} method The method to call each interval.
	 * @param {Number} interval The number of milliseconds between each interval.
	 * @param {Boolean} catchup If true, the interval will fire multiple times 
	 * retrospectively when the engine jumps in time. If false, the interval will 
	 * only fire a single time even if a large period of engine time has elapsed 
	 */
	init: function (method, interval, catchup = true) {
		var self = this;
		
		this._method = method;
		this._interval = interval;
		this._time = 0;
		this._started = ige._currentTime;
		this._catchup = catchup;
		
		// Attach ourselves to the time system
		ige.time.addTimer(this);
	},

	/**
	 * Adds time to the timer's internal clock. 
	 * @param {Number} time The time in milliseconds to add to the timer's internal clock.
	 * @returns {*}
	 */
	addTime: function (time) {
		this._time += time;
		return this;
	},

	/**
	 * Cancels the timer stopping all future method calls.
	 * @returns {*}
	 */
	cancel: function () {
		ige.time.removeTimer(this);
		return this;
	},

	/**
	 * Checks for a timer event to see if we should call the timer method. This is
	 * called automatically by the IgeTimeComponent class and does not need to be
	 * called manually.
	 * @returns {*}
	 */
	update: function () {
		var intendedTime;
		var overTime = this._time - this._interval;

		if (overTime > 0) {
			intendedTime = ige._currentTime - overTime;

			// Fire an interval
			this._method(ige._currentTime, intendedTime);

			if (this._catchup) {
				this._time -= this._interval;
			}
			else {
				this._time = 0;
			}
		}

		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeInterval; }
