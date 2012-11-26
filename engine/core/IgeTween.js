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
		this._currentStep = 0;
		if (propertyObj !== undefined) { this.step(propertyObj); }
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
			this._currentStep = 0;
			this.step(propertyObj);
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
	 * Defines a step in a multi-stage tween.
	 * @param {Object} propertyObj The properties to
	 * tween during this step.
	 * @param {Number=} durationMs The number of milliseconds
	 * to spend tweening this step, or if not provided uses
	 * the current tween durationMs setting.
	 * @param {String=} easing The name of the easing method
	 * to use during this step.
	 * @return {*}
	 */
	step: function (propertyObj, durationMs, easing) {
		if (propertyObj !== undefined) {
			// Check if we have already been given a standard
			// non-staged property
			this._steps.push({
				props: propertyObj,
				durationMs: durationMs,
				easing: easing
			});
		}

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
	 * Sets the name of the easing method to use with the tween.
	 * @param methodName
	 * @return {*}
	 */
	easing: function (methodName) {
		if (methodName !== undefined) {
			this._easing = methodName;
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
	 */
	start: function () {
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
		this._targetObj._tweenArr.pull(this);

		return this;
	},

	/**
	 * Starts all tweens registerd to an object.
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