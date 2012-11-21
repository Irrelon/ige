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

			this._updateUiPosition();
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

			this._updateUiPosition();
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

			this._updateUiPosition();
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

			this._updateUiPosition();
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

			this._updateUiPosition();
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

			this._updateUiPosition();
			return this;
		}

		return this._uiY;
	},

	/**
	 * Gets / sets the geometry.x in pixels.
	 * @param {Number, String=} px Either the width in pixels or a percentage
	 * @param {Number=} modifier A value to add to the final width. Useful when
	 * you want to alter a percentage value by a certain number of pixels after
	 * it has been calculated.
	 * @return {*}
	 */
	width: function (px, lockAspect, modifier, noUpdate) {
		if (px !== undefined) {
			this._width = px;
			this._widthModifier = modifier !== undefined ? modifier : 0;

			if (typeof(px) === 'string') {
				if (this._parent) {
					// Percentage
					var parentWidth = this._parent._geometry.x,
						val = parseInt(px, 10),
						newVal,
						ratio;

					// Calculate real width from percentage
					newVal = (parentWidth / 100 * val) + this._widthModifier | 0;

					if (lockAspect) {
						// Calculate the height from the change in width
						ratio = newVal / this._geometry.x;
						this.height(this._geometry.y / ratio, false, 0, noUpdate);
					}

					this._geometry.x = newVal;
					this._geometry.x2 = Math.floor(this._geometry.x / 2);
				} else {
					// We don't have a parent so use the main canvas
					// as a reference
					var parentWidth = ige._geometry.x,
						val = parseInt(px, 10);

					// Calculate real height from percentage
					this._geometry.x = (parentWidth / 100 * val) + this._widthModifier | 0;
					this._geometry.x2 = Math.floor(this._geometry.x / 2);
				}
			} else {
				if (lockAspect) {
					// Calculate the height from the change in width
					var ratio = px / this._geometry.x;
					this.height(this._geometry.y * ratio, false, 0, noUpdate);
				}

				this._geometry.x = px;
				this._geometry.x2 = Math.floor(this._geometry.x / 2);
			}

			if (!noUpdate) {
				this._updateUiPosition();
			}
			return this;
		}

		return this._width;
	},

	/**
	 * Gets / sets the geometry.y in pixels.
	 * @param {Number=} px
	 * @param {Number=} modifier A value to add to the final height. Useful when
	 * you want to alter a percentage value by a certain number of pixels after
	 * it has been calculated.
	 * @return {*}
	 */
	height: function (px, lockAspect, modifier, noUpdate) {
		if (px !== undefined) {
			this._height = px;
			this._heightModifier = modifier !== undefined ? modifier : 0;

			if (typeof(px) === 'string') {
				if (this._parent) {
					// Percentage
					var parentHeight = this._parent._geometry.y,
						val = parseInt(px, 10),
						newVal,
						ratio;

					// Calculate real height from percentage
					// Calculate real width from percentage
					newVal = (parentHeight / 100 * val) + this._heightModifier | 0;

					if (lockAspect) {
						// Calculate the height from the change in width
						ratio = newVal / this._geometry.y;
						this.width(this._geometry.x / ratio, false, 0, noUpdate);
					}

					this._geometry.y = newVal;
					this._geometry.y2 = Math.floor(this._geometry.y / 2);
				} else {
					// We don't have a parent so use the main canvas
					// as a reference
					var parentHeight = ige._geometry.y,
						val = parseInt(px, 10);

					// Calculate real height from percentage
					this._geometry.y = (parentHeight / 100 * val) + this._heightModifier | 0;
					this._geometry.y2 = Math.floor(this._geometry.y / 2);
				}
			} else {
				if (lockAspect) {
					// Calculate the height from the change in width
					var ratio = px / this._geometry.y;
					this.width(this._geometry.x * ratio, false, 0, noUpdate);
				}

				this._geometry.y = px;
				this._geometry.y2 = Math.floor(this._geometry.y / 2);
			}

			if (!noUpdate) {
				this._updateUiPosition();
			}
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
	_updateUiPosition: function () {
		if (this._parent) {
			var parentGeom = this._parent._geometry,
				geom = this._geometry;

			if (this._width) { this.width(this._width, false, this._widthModifier, true); }
			if (this._height) { this.height(this._height, false, this._heightModifier, true); }

			if (this._uiXAlign === 'right') {
				this._translate.x = Math.floor(parentGeom.x2 - geom.x2 - this._uiX);
			} else if (this._uiXAlign === 'center') {
				this._translate.x = Math.floor(this._uiX);
			} else if (this._uiXAlign === 'left') {
				this._translate.x = Math.floor(this._uiX + geom.x2 - (parentGeom.x2));
			}

			if (this._uiYAlign === 'bottom') {
				this._translate.y = Math.floor(parentGeom.y2 - geom.y2 - this._uiY);
			} else if (this._uiYAlign === 'middle') {
				this._translate.y = Math.floor(this._uiY);
			} else if (this._uiYAlign === 'top') {
				this._translate.y = Math.floor(this._uiY + geom.y2 - (parentGeom.y2));
			}

			this.dirty(true);
		}
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiPositionExtension; }