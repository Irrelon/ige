var IgeUiPositionExtension = {
	/**
	 * Gets / sets the viewport's x position relative to the left of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	left: function (val) {
		if (val !== undefined) {
			this._uiX = val;
			this._uiXAlign = 'left';

			this._updateTranslation();
			return this;
		}

		return this._uiX;
	},

	/**
	 * Gets / sets the viewport's x position relative to the center of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	center: function (val) {
		if (val !== undefined) {
			this._uiX = val;
			this._uiXAlign = 'center';

			this._updateTranslation();
			return this;
		}

		return this._uiX;
	},

	/**
	 * Gets / sets the viewport's x position relative to the right of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	right: function (val) {
		if (val !== undefined) {
			this._uiX = val;
			this._uiXAlign = 'right';

			this._updateTranslation();
			return this;
		}

		return this._uiX;
	},

	/**
	 * Gets / sets the viewport's y position relative to the top of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	top: function (val) {
		if (val !== undefined) {
			this._uiY = val;
			this._uiYAlign = 'top';

			this._updateTranslation();
			return this;
		}

		return this._uiY;
	},

	/**
	 * Gets / sets the viewport's y position relative to the middle of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	middle: function (val) {
		if (val !== undefined) {
			this._uiY = val;
			this._uiYAlign = 'middle';

			this._updateTranslation();
			return this;
		}

		return this._uiY;
	},

	/**
	 * Gets / sets the viewport's y position relative to the bottom of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	bottom: function (val) {
		if (val !== undefined) {
			this._uiY = val;
			this._uiYAlign = 'bottom';

			this._updateTranslation();
			return this;
		}

		return this._uiY;
	},

	/**
	 * Gets / sets the geometry.x in pixels.
	 * @param {Number, String=} px Either the width in pixels or a percentage
	 * @return {*}
	 */
	width: function (px) {
		if (px !== undefined) {
			this._width = px;

			if (typeof(px) === 'string') {
				if (this._parent) {
					// Percentage
					var parentWidth = this._parent.geometry.x,
						val = parseInt(px, 10);

					// Calculate real width from percentage
					this.geometry.x = (parentWidth / 100 * val) | 0;
				} else {
					// We don't have a parent so use the main canvas
					// as a reference
					var parentWidth = ige._canvas.width,
						val = parseInt(px, 10);

					// Calculate real height from percentage
					this.geometry.x = (parentWidth / 100 * val) | 0;
				}
			} else {
				this.geometry.x = px;
			}

			this._updateTranslation();
			return this;
		}

		return this._width;
	},

	/**
	 * Gets / sets the geometry.y in pixels.
	 * @param {Number=} px
	 * @return {*}
	 */
	height: function (px) {
		if (px !== undefined) {
			this._height = px;

			if (typeof(px) === 'string') {
				if (this._parent) {
					// Percentage
					var parentHeight = this._parent.geometry.y,
						val = parseInt(px, 10);

					// Calculate real height from percentage
					this.geometry.y = (parentHeight / 100 * val) | 0;
				} else {
					// We don't have a parent so use the main canvas
					// as a reference
					var parentHeight = ige._canvas.height,
						val = parseInt(px, 10);

					// Calculate real height from percentage
					this.geometry.y = (parentHeight / 100 * val) | 0;
				}
			} else {
				this.geometry.y = px;
			}

			this._updateTranslation();
			return this;
		}

		return this._height;
	},

	/**
	 * Sets the correct translate x and y for the viewport's left, right
	 * top and bottom co-ordinates.
	 * @private
	 */
		// TODO: Update so that it takes into account the parent element's position etc
	_updateTranslation: function () {
		if (this._uiXAlign === 'right') {
			this.transform._translate.x = ige._canvas.width - this._uiX - this.geometry.x;
		} else if (this._uiXAlign === 'center') {
			this.transform._translate.x = ige._canvasWidth2 + this._uiX - (this.geometry.x / 2);
		} else {
			this.transform._translate.x = this._uiX;
		}

		if (this._uiYAlign === 'bottom') {
			this.transform._translate.y = ige._canvas.height - this._uiY - this.geometry.y;
		} else if (this._uiYAlign === 'middle') {
			this.transform._translate.y = ige._canvasHeight2 + this._uiY - (this.geometry.y / 2);
		} else {
			this.transform._translate.y = this._uiY;
		}

		this.dirty(true);
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiPositionExtension; }