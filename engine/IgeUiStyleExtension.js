var IgeUiStyleExtension = {
	/**
	 * Sets the current background texture and the repeatType
	 * to determine in which axis the image should be repeated.
	 * Accepts "repeat", "repeat-x", "repeat-y" and "no-repeat".
	 * @param {IgeTexture=} texture
	 * @param {String=} repeatType
	 * @return {*} Returns this if any parameter is specified or
	 * the current background image if no parameters are specified.
	 */
	backgroundImage: function (texture, repeatType) {
		if (texture && texture.image) {
			if (!repeatType) { repeatType = 'no-repeat'; }

			// Store the repeatType
			this._patternRepeat = repeatType;

			// Store the texture
			this._patternTexture = texture;

			// Resize the image if required
			if (this._backgroundSize) {
				texture.resize(this._backgroundSize.x, this._backgroundSize.y);
				this._patternWidth = this._backgroundSize.x;
				this._patternHeight = this._backgroundSize.y;
			} else {
				this._patternWidth = texture.image.width;
				this._patternHeight = texture.image.height;
			}

			// Create the pattern from the texture
			this._patternFill = ige._ctx.createPattern(texture.image, repeatType);

			texture.restoreOriginal();
			this.dirty(true);
			return this;
		}

		return this._patternFill;
	},

	backgroundSize: function (x, y) {
		if (x !== undefined && y !== undefined) {
			if (typeof(x) === 'string') {
				// Work out the actual size in pixels
				// from the percentage
				x = this._width / 100 * parseInt(x, 10);
			}

			if (typeof(y) === 'string') {
				// Work out the actual size in pixels
				// from the percentage
				y = this._height / 100 * parseInt(y, 10);
			}
			this._backgroundSize = {x: x, y: y};

			// Reset the background image
			if (this._patternTexture && this._patternRepeat) {
				this.backgroundImage(this._patternTexture, this._patternRepeat);
			}
			this.dirty(true);
			return this;
		}

		return this._backgroundSize;
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
			this.dirty(true);
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
			this._backgroundPosition = {x: x, y: y};
			this.dirty(true);
			return this;
		}

		return this._backgroundPosition;
	},

	borderColor: function (color) {
		if (color !== undefined) {
			this._borderColor = color;
			this._borderLeftColor = color;
			this._borderTopColor = color;
			this._borderRightColor = color;
			this._borderBottomColor = color;
			this.dirty(true);
			return this;
		}

		return this._borderColor;
	},

	borderWidth: function (px) {
		if (px !== undefined) {
			this._borderWidth = px;
			this._borderLeftWidth = px;
			this._borderTopWidth = px;
			this._borderRightWidth = px;
			this._borderBottomWidth = px;
			this.dirty(true);
			return this;
		}

		return this._borderWidth;
	},

	borderRadius: function (px) {
		if (px !== undefined) {
			this._borderRadius = px;
			this._borderTopLeftRadius = px;
			this._borderTopRightRadius = px;
			this._borderBottomRightRadius = px;
			this._borderBottomLeftRadius = px;
			this.dirty(true);
			return this;
		}

		return this._borderRadius;
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiStyleExtension; }