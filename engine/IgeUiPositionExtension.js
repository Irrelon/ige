var IgeUiPositionExtension = {
	/**
	 * Gets / sets the viewport's x position relative to the left of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	left: function (val) {
		if (val !== undefined) {
			this._vpX = val;
			this._vpXAlign = 'left';

			this._updateTranslation();
		}

		return this._vpX;
	},

	/**
	 * Gets / sets the viewport's x position relative to the center of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	center: function (val) {
		if (val !== undefined) {
			this._vpX = val;
			this._vpXAlign = 'center';

			this._updateTranslation();
		}

		return this._vpX;
	},

	/**
	 * Gets / sets the viewport's x position relative to the right of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	right: function (val) {
		if (val !== undefined) {
			this._vpX = val;
			this._vpXAlign = 'right';

			this._updateTranslation();
		}

		return this._vpX;
	},

	/**
	 * Gets / sets the viewport's y position relative to the top of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	top: function (val) {
		if (val !== undefined) {
			this._vpY = val;
			this._vpYAlign = 'top';

			this._updateTranslation();
		}

		return this._vpY;
	},

	/**
	 * Gets / sets the viewport's y position relative to the middle of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	middle: function (val) {
		if (val !== undefined) {
			this._vpY = val;
			this._vpYAlign = 'middle';

			this._updateTranslation();
		}

		return this._vpY;
	},

	/**
	 * Gets / sets the viewport's y position relative to the bottom of
	 * the canvas.
	 * @param {Number} val
	 * @return {Number}
	 */
	bottom: function (val) {
		if (val !== undefined) {
			this._vpY = val;
			this._vpYAlign = 'bottom';

			this._updateTranslation();
		}

		return this._vpY;
	},

	/**
	 * Sets the correct translate x and y for the viewport's left, right
	 * top and bottom co-ordinates.
	 * @private
	 */
	_updateTranslation: function () {
		if (this._vpXAlign === 'right') {
			this.transform._translate.x = ige._canvas.width - this._vpX - this.geometry.x;
		} else if (this._vpXAlign === 'center') {
			this.transform._translate.x = ige._canvasWidth2 + this._vpX;
		} else {
			this.transform._translate.x = this._vpX;
		}

		if (this._vpYAlign === 'bottom') {
			this.transform._translate.y = ige._canvas.height - this._vpY - this.geometry.y;
		} else if (this._vpYAlign === 'middle') {
			this.transform._translate.y = ige._canvasHeight2 + this._vpY;
		} else {
			this.transform._translate.y = this._vpY;
		}
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiPositionExtension; }