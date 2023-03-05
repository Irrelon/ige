"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeTimeout', function ($ige, $time, IgeInterval) {
	/**
	 * Provides an alternative to setTimeout() which works based on the engine's internal
	 * time system allowing timeouts to fire correctly, taking into account pausing the
	 * game and differences in rendering speed etc.
	 */
	var IgeTimeout = IgeInterval.extend({
		classId: 'IgeTimeout',
		
		/**
		 * Creates a new timeout that will call the passed method after the number of
		 * milliseconds specified by the timeout parameter has been reached.
		 * @param {Function} method The method to call on timeout.
		 * @param {Number} timeout The number of milliseconds before the timeout.
		 * @example #Create a timer that will call a method after 1 second of engine time
		 *     var myTimeout = new IgeTimeout(function () {
	 *     		console.log('interval fired');
	 *     }, 1000);
		 */
		init: function (method, timeout) {
			IgeInterval.prototype.init.call(this, method, timeout);
		},
		
		/**
		 * Cancels the timer, stops the timeout.
		 * @example #Cancel a timeout timer
		 *     var myTimeout = new IgeTimeout(function () {
	 *     		console.log('timeout fired');
	 *     }, 1000);
		 *
		 *     myTimeout.cancel();
		 * @returns {*}
		 */
		cancel: function () {
			return IgeInterval.prototype.cancel.call(this);
		},
		
		/**
		 * Resets the time and lets the timeout begin anew.
		 * @returns {*}
		 */
		reset: function() {
			this._time = 0;
			if ($ige.engine.time._timers.indexOf(this) == -1) {
				$ige.engine.time.addTimer(this);
			}
		},
		
		/**
		 * Checks for a timeout event to see if we should call the timeout method. This is
		 * called automatically by the IgeTimeComponent class and does not need to be
		 * called manually.
		 * @returns {*}
		 */
		update: function () {
			if (this._time > this._interval) {
				// Fire an interval
				this._method($time._currentTime);
				$ige.engine.time.removeTimer(this);
			}
			
			return this;
		}
	});
	
	return IgeTimeout;
});