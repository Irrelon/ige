var IgeTween = IgeClass.extend({
	init: function (propertyObj, durationMs, options) {
		// Create a new tween object and return it
		// so the user can decide when to start it
		this._propertyObj = propertyObj !== undefined ? propertyObj : {};
		this._durationMs = durationMs !== undefined ? durationMs : 0;
		this._options = options;

		// Sort out the options
		if (options.easing) { this.easing(options.easing); } else { this._easing = 'none'; }
		if (options.startTime !== undefined) { this.startTime(options.startTime); }
		if (options.beforeTween !== undefined) { this.beforeTween(options.beforeTween); }
		if (options.afterTween !== undefined) { this.afterTween(options.afterTween); }
	},

	/**
	 * Sets the tween's target properties to tween to.
	 * @param propertyObj
	 */
	properties: function (propertyObj) {
		this._propertyObj = propertyObj;
	},

	/**
	 * Sets the duration of the tween in milliseconds.
	 * @param durationMs
	 */
	duration: function (durationMs) {
		this._durationMs = durationMs;
	},

	/**
	 * Sets the method to be called just before the tween has started.
	 * @param callback
	 */
	beforeTween: function (callback) {
		this._beforeTween = callback;
	},

	/**
	 * Sets the method to be called just after the tween has ended.
	 * @param callback
	 */
	afterTween: function (callback) {
		this._afterTween = callback;
	},

	/**
	 * Sets the name of the easing method to use with the tween.
	 * @param methodName
	 */
	easing: function (methodName) {
		this._easing = methodName;
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

	},

	/**
	 * Stops the tweening operation.
	 */
	stop: function () {

	}
});