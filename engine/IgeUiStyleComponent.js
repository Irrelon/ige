var IgeUiStyleComponent = IgeClass.extend({
	classId: 'IgeUiStyleComponent',
	componentId: 'uiStyle',

	init: function (gameObject, options) {
		this._entity = gameObject;
		this._options = options;
	},

	/**
	 * Sets the current background texture and the repeatX
	 * and repeatY flags to determine in which axis the image
	 * should be repeated.
	 * @param {IgeTexture=} texture
	 * @param {Boolean=} repeatX
	 * @param {Boolean=} repeatY
	 * @return {*} Returns this if any parameter is specified or
	 * the current IgeTexture if no parameters are specified.
	 */
	backgroundImage: function (texture, repeatX, repeatY) {
		if (texture !== undefined) {
			this.texture(texture);
			return this;
		}

		if (repeatX !== undefined) {
			this._backgroundRepeatX = repeatX;
			return this;
		}

		if (repeatY !== undefined) {
			this._backgroundRepeatY = repeatY;
			return this;
		}

		return this._texture;
	},

	/**
	 * Gets / sets the color to use as a background when
	 * rendering the UI element.
	 * @param {CSSColor, CanvasGradient, CanvasPattern=} color
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	backgroundColor: function (color) {
		if (color !== undefined) {
			this._backgroundColor = color;
			return this;
		}

		return this._backgroundColor;
	},

	/**
	 * Gets / sets the position to start rendering the background image at.
	 * @param {Number=} x
	 * @param {Number=} y
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	backgroundPosition: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._backgroundPosition = new IgePoint(x, z, 0);
			return this;
		}

		return this._backgroundPosition;
	},

	width: function (px) {
		if (px !== undefined) {
			this._width = px;
			return this;
		}

		return this._width;
	},

	height: function (px) {
		if (px !== undefined) {
			this._height = px;
			return this;
		}

		return this._height;
	},

	borderColor: function (color) {
		if (color !== undefined) {
			this._borderColor = color;
			return this;
		}

		return this._borderColor;
	},

	borderWidth: function (px) {
		if (px !== undefined) {
			this._borderWidth = px;
			return this;
		}

		return this._borderWidth;
	},

	borderRadius: function (px) {
		if (px !== undefined) {
			this._borderRadius = px;
			return this;
		}

		return this._borderRadius;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiStyleComponent; }