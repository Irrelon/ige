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
	 */
	init: function (method, interval) {
		var self = this;
		
		this._method = method;
		this._interval = interval;
		this._time = 0;
		this._started = ige._currentTime;
		
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
		if (this._time > this._interval) {
			// Fire an interval
			this._method(ige._currentTime);
			this._time -= this._interval;
		}
		
		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeInterval; }