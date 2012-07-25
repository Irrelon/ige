var IgeScene2d = IgeEntity.extend({
	classId: 'IgeScene2d',

	init: function () {
		this._super();

		this._shouldRender = true;
		this._autoSize = true;

		// Set the geometry of the scene to the main canvas
		// width / height - used when positioning UI elements
		this.geometry.x = ige.geometry.x;
		this.geometry.y = ige.geometry.y;
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
	tick: function (ctx) {
		if (this._shouldRender) {
			this._super(ctx);
		}
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		// Set width / height of scene to match main ige (SCENES ARE ALWAYS THE FULL IGE SIZE!!)
		if (this._autoSize) {
			this.geometry = ige.geometry.clone();
		}

		// Resize any children
		var arr = this._children,
			arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount]._resizeEvent(event);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeScene2d; }