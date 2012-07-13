var IgeScene2d = IgeObject.extend({
	classId: 'IgeScene2d',

	init: function () {
		this._super();

		this._shouldRender = true;
	},

	/**
	 * Gets / sets the _shouldRender property. If set to true, the scene's child
	 * object's tick methods will be called.
	 * @param {Boolean} val
	 * @return {Boolean}
	 */
	shouldRender: function (val) {
		if (val !== undefined) {
			this._shouldRender = val;
			return this;
		}

		return this._shouldRender;
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx, scene) {
		if (this._shouldRender) {
			this._super(ctx, scene);
		}
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		// Resize any children
		var arr = this._children,
			arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount]._resizeEvent(event);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeScene2d; }