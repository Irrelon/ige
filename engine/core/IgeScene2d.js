/**
 * Creates a new 2d scene.
 */
var IgeScene2d = IgeEntity.extend({
	classId: 'IgeScene2d',

	init: function () {
		this._alwaysInView = true;
		this._super();

		this._shouldRender = true;
		this._autoSize = true;

		// Set the geometry of the scene to the main canvas
		// width / height - used when positioning UI elements
		this._geometry.x = ige._geometry.x;
		this._geometry.y = ige._geometry.y;
	},

	/**
	 * Gets / sets the auto-size property. If set to true, the scene will
	 * automatically resize to the screen's geometry.
	 * @param val
	 * @return {*}
	 */
	autoSize: function (val) {
		if (typeof(val) !== 'undefined') {
			this._autoSize = val;
			return this;
		}

		return this._autoSize;
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

	ignoreCamera: function (val) {
		if (val !== undefined) {
			this._ignoreCamera = val;
			return this;
		}

		return this._ignoreCamera;
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx) {
		if (this._shouldRender) {
			if (this._ignoreCamera) {
				// Translate the scene so it is always center of the camera
				var cam = ige._currentCamera;
				this.translateTo(cam._translate.x, cam._translate.y, cam._translate.z);
				this.scaleTo(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
				this.rotateTo(-cam._rotate.x, -cam._rotate.y, -cam._rotate.z);
				//this._localMatrix.multiply(ige._currentCamera._worldMatrix.getInverse());
			}
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
			this._geometry = ige._geometry.clone();
		}

		// Resize any children
		var arr = this._children,
			arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount]._resizeEvent(event);
		}
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {String}
	 */
	_stringify: function () {
		// Get the properties for all the super-classes
		var str = this._super(), i;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
					case '_shouldRender':
						str += ".shouldRender(" + this.shouldRender() + ")";
						break;
					case '_autoSize':
						str += ".autoSize(" + this.autoSize() + ")";
						break;
				}
			}
		}

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeScene2d; }