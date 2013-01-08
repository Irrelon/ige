/**
 * Creates a new 2d scene.
 */
var IgeScene2d = IgeEntity.extend({
	classId: 'IgeScene2d',

	init: function () {
		this._mouseAlwaysInside = true;
		this._alwaysInView = true;
		IgeEntity.prototype.init.call(this);

		this._shouldRender = true;
		this._autoSize = true;

		// Set the geometry of the scene to the main canvas
		// width / height - used when positioning UI elements
		this._geometry.x = ige._geometry.x;
		this._geometry.y = ige._geometry.y;
	},

	/**
	 * Gets / sets the auto-size property. If set to true, the scene will
	 * automatically resize to the engine's canvas geometry.
	 * @param {Boolean=} val If true, will autosize the scene to match the
	 * main canvas geometry. This is enabled by default and is unlikely to
	 * help you if you switch it off.
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
	 * @param {Boolean} val If set to false, no child entities will be rendered.
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
	 * Gets / sets the flag that determines if the scene will ignore camera
	 * transform values allowing the scene to remain static on screen
	 * regardless of the camera transform.
	 * @param {Boolean=} val True to ignore, false to not ignore.
	 * @return {*}
	 */
	ignoreCamera: function (val) {
		if (val !== undefined) {
			this._ignoreCamera = val;
			return this;
		}

		return this._ignoreCamera;
	},
	
	update: function (ctx) {
		if (this._ignoreCamera) {
			// Translate the scene so it is always center of the camera
			var cam = ige._currentCamera;
			this.translateTo(cam._translate.x, cam._translate.y, cam._translate.z);
			this.scaleTo(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
			this.rotateTo(-cam._rotate.x, -cam._rotate.y, -cam._rotate.z);
			//this._localMatrix.multiply(ige._currentCamera._worldMatrix.getInverse());
		}
		
		IgeEntity.prototype.update.call(this, ctx);
	},

	/**
	 * Processes the actions required each render frame.
	 * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		if (this._shouldRender) {
			IgeEntity.prototype.tick.call(this, ctx);
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
		var str = IgeEntity.prototype._stringify.call(this), i;

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