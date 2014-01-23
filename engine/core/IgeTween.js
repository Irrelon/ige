/**
 * Creates a new tween instance.
 */
var IgeTween = IgeClass.extend({
	classId: 'IgeTween',

	init: function (targetObj, propertyObj, durationMs, options) {
		// Create a new tween object and return it
		// so the user can decide when to start it
		this._targetObj = targetObj;
		this._steps = [];
		this._currentStep = -1;
		if (propertyObj !== undefined) {
			this.stepTo(propertyObj);
		}
		this._durationMs = durationMs !== undefined ? durationMs : 0;
		this._started = false;
		this._stepDirection = false;

		// Sort out the options
		if (options && options.easing) { this.easing(options.easing); } else { this.easing('none'); }
		if (options && options.startTime !== undefined) { this.startTime(options.startTime); }
		if (options && options.beforeTween !== undefined) { this.beforeTween(options.beforeTween); }
		if (options && options.afterTween !== undefined) { this.afterTween(options.afterTween); }
	},

	/**
	 * Sets the object in which the properties to tween exist.
	 * @param targetObj
	 * @return {*}
	 */
	targetObj: function (targetObj) {
		if (targetObj !== undefined) {
			this._targetObj = targetObj;
		}

		return this;
	},

	/**
	 * Sets the tween's target properties to tween to.
	 * @param propertyObj
	 * @return {*}
	 */
	properties: function (propertyObj) {
		if (propertyObj !== undefined) {
			// Reset any existing steps and add this new one
			this._steps = [];
			this._currentStep = -1;
			this.stepTo(propertyObj);
		}

		return this;
	},

	/**
	 * Gets / sets the repeat mode for the tween. If the mode
	 * is set to 1 the tween will repeat from the first step.
	 * If set to 2 the tween will reverse the order of the steps
	 * each time the repeat occurs. The count determines the
	 * number of times the tween will be repeated before stopping.
	 * Setting the count to -1 will make it repeat infinitely.
	 * @param val
	 * @param count
	 * @return {*}
	 */
	repeatMode: function (val, count) {
		if (val !== undefined) {
			this._repeatMode = val;
			this.repeatCount(count);
			return this;
		}

		return this._repeatMode;
	},

	/**
	 * Gets / sets the repeat count. The count determines the
	 * number of times the tween will be repeated before stopping.
	 * Setting the count to -1 will make it repeat infinitely.
	 * This setting is used in conjunction with the repeatMode()
	 * method. If you just set a repeat count and no mode then
	 * the tween will not repeat.
	 * @param val
	 * @return {*}
	 */
	repeatCount: function (val) {
		if (val !== undefined) {
			this._repeatCount = val;
			this._repeatedCount = 0;
			return this;
		}

		return this._repeatCount;
	},

	/**
	 * DEPRECIATED, Renamed to stepTo().
	 */
	step: function (propertyObj, durationMs, easing) {
		this.log('The step method has been renamed to stepTo(). Please update your code as the step() method will soon be removed.', 'warning');
		this.stepTo(propertyObj, durationMs, easing);
		return this;
	},

	/**
	 * Defines a step in a multi-stage tween. Uses the properties
	 * as destination value.
	 * @param {Object} propertyObj The properties to
	 * tween during this step.
	 * @param {Number=} durationMs The number of milliseconds
	 * to spend tweening this step, or if not provided uses
	 * the current tween durationMs setting.
	 * @param {String=} easing The name of the easing method
	 * to use during this step.
	 * @param {Boolean=} delta If true will set the step to use
	 * delta values instead of absolute values as the destination.
	 * @return {*}
	 */
	stepTo: function (propertyObj, durationMs, easing, delta) {
		if (propertyObj !== undefined) {
			// Check if we have already been given a standard
			// non-staged property
			this._steps.push({
				props: propertyObj,
				durationMs: durationMs,
				easing: easing,
				isDelta: delta
			});
		}

		return this;
	},
	
	/**
	 * Defines a step in a multi-stage tween. Uses the properties
	 * as deltas, not as destination values
	 * @param {Object} propertyObj The properties to
	 * tween during this step.
	 * @param {Number=} durationMs The number of milliseconds
	 * to spend tweening this step, or if not provided uses
	 * the current tween durationMs setting.
	 * @param {String=} easing The name of the easing method
	 * to use during this step.
	 * @return {*}
	 */
	stepBy: function (propertyObj, durationMs, easing) {
		this.stepTo(
			propertyObj,
			durationMs,
			easing,
			true
		);
		
		return this;
	},

	/**
	 * Sets the duration of the tween in milliseconds.
	 * @param durationMs
	 * @return {*}
	 */
	duration: function (durationMs) {
		if (durationMs !== undefined) {
			this._durationMs = durationMs;
		}

		return this;
	},

	/**
	 * Sets the method to be called just before the tween has started.
	 * @param callback
	 * @return {*}
	 */
	beforeTween: function (callback) {
		if (callback !== undefined) {
			this._beforeTween = callback;
		}

		return this;
	},

	/**
	 * Sets the method to be called just after the tween has ended.
	 * @param callback
	 * @return {*}
	 */
	afterTween: function (callback) {
		if (callback !== undefined) {
			this._afterTween = callback;
		}

		return this;
	},

	/**
	 * Sets the method to be called just before a tween step has
	 * started.
	 * @param callback
	 * @return {*}
	 */
	beforeStep: function (callback) {
		if (callback !== undefined) {
			this._beforeStep = callback;
		}

		return this;
	},

	/**
	 * Sets the method to be called just after a tween step has
	 * ended.
	 * @param callback
	 * @return {*}
	 */
	afterStep: function (callback) {
		if (callback !== undefined) {
			this._afterStep = callback;
		}

		return this;
	},

	/**
	 * Sets the method to be called just after a tween has changed
	 * the values of the target object every update tick.
	 * @param callback
	 * @return {*}
	 */
	afterChange: function (callback) {
		if (callback !== undefined) {
			this._afterChange = callback;
		}

		return this;
	},

	/**
	 * Returns the object that this tween is modifying.
	 * @return {*}
	 */
	targetObject: function () {
		return this._targetObj;
	},

	/**
	 * Sets the name of the easing method to use with the tween.
	 * @param methodName
	 * @return {*}
	 */
	easing: function (methodName) {
		if (methodName !== undefined) {
			if (ige.tween.easing[methodName]) {
				this._easing = methodName;
			} else {
				this.log('The easing method you have selected does not exist, please use a valid easing method. For a list of easing methods please inspect ige.tween.easing from your console.', 'error', ige.tween.easing);
			}
		}

		return this;
	},

	/**
	 * Sets the timestamp at which the tween should start.
	 * @param timeMs
	 * @return {*}
	 */
	startTime: function (timeMs) {
		if (timeMs !== undefined) {
			this._startTime = timeMs;
		}

		return this;
	},

	/**
	 * Starts the tweening operation.
	 * @param {Number=} timeMs If set, the tween will start this
	 * many milliseconds in the future.
	 */
	start: function (timeMs) {
		if (timeMs !== undefined) {
			this.startTime(timeMs + ige._currentTime);
		}
		
		ige.tween.start(this);

		// Add the tween to the target object's tween array
		this._targetObj._tweenArr = this._targetObj._tweenArr || [];
		this._targetObj._tweenArr.push(this);

		return this;
	},

	/**
	 * Stops the tweening operation.
	 */
	stop: function () {
		ige.tween.stop(this);
		if (this._targetObj._tweenArr) {
			this._targetObj._tweenArr.pull(this);
		}

		return this;
	},

	/**
	 * Starts all tweens registered to an object.
	 * @private
	 */
	startAll: function () {
		if (this._targetObj._tweenArr) {
			this._targetObj._tweenArr.eachReverse(function (tweenItem) {
				tweenItem.start();
			});
		}

		return this;
	},

	/**
	 * Stops all tweens registered to an object.
	 * @private
	 */
	stopAll: function () {
		if (this._targetObj._tweenArr) {
			this._targetObj._tweenArr.eachReverse(function (tweenItem) {
				tweenItem.stop();
			});
		}

		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTween; }