var IgeTween = IgeClass.extend({
	init: function (targetObj, propertyObj, durationMs, options) {
		// Create a new tween object and return it
		// so the user can decide when to start it
		this._targetObj = targetObj;
		this._propertyObj = propertyObj !== undefined ? propertyObj : {};
		this._durationMs = durationMs !== undefined ? durationMs : 0;
		this._started = false;

		// Sort out the options
		if (options && options.easing) { this.easing(options.easing); } else { this.easing('none'); }
		if (options && options.startTime !== undefined) { this.startTime(options.startTime); }
		if (options && options.beforeTween !== undefined) { this.beforeTween(options.beforeTween); }
		if (options && options.afterTween !== undefined) { this.afterTween(options.afterTween); }
	},

	/**
	 * Sets the object in which the properties to tween exist.
	 * @param targetObj
	 */
	targetObj: function (targetObj) {
		this._targetObj = targetObj;
		return this;
	},

	/**
	 * Sets the tween's target properties to tween to.
	 * @param propertyObj
	 */
	properties: function (propertyObj) {
		this._propertyObj = propertyObj;
		return this;
	},

	/**
	 * Sets the duration of the tween in milliseconds.
	 * @param durationMs
	 */
	duration: function (durationMs) {
		this._durationMs = durationMs;
		return this;
	},

	/**
	 * Sets the method to be called just before the tween has started.
	 * @param callback
	 */
	beforeTween: function (callback) {
		this._beforeTween = callback;
		return this;
	},

	/**
	 * Sets the method to be called just after the tween has ended.
	 * @param callback
	 */
	afterTween: function (callback) {
		this._afterTween = callback;
		return this;
	},

	/**
	 * Sets the name of the easing method to use with the tween.
	 * @param methodName
	 */
	easing: function (methodName) {
		this._easing = methodName;
		return this;
	},

	/**
	 * Sets the timestamp at which the tween should start.
	 * @param timeMs
	 */
	startTime: function (timeMs) {
		this._startTime = timeMs;
	},

	/**
	 * Starts the tweening operation.
	 */
	start: function () {
		/*ige.tween.start(
			this._targetObj,
			this._propertyObj,
			this._durationMs,
			this._options
		);*/

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

	startAll: Object.prototype._tweenStartAll,
	stopAll: Object.prototype._tweenStopAll
});