var IgeUiPositionComponent = IgeClass.extend({
	classId: 'IgeUiPositionComponent',
	componentId: 'uiPosition',

	init: function (gameObject, options) {
		this._entity = gameObject;
		this._options = options;
	},

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
		}

		return this._uiY;
	},

	/**
	 * Sets the correct translate x and y for the viewport's left, right
	 * top and bottom co-ordinates.
	 * @private
	 */
	_updateTranslation: function () {
		var entity = this._entity;
		if (this._uiXAlign === 'right') {
			entity.transform._translate.x = ige._canvas.width - this._uiX - entity.geometry.x;
		} else if (this._uiXAlign === 'center') {
			entity.transform._translate.x = ige._canvasWidth2 + this._uiX;
		} else {
			entity.transform._translate.x = this._uiX;
		}

		if (this._uiYAlign === 'bottom') {
			entity.transform._translate.y = ige._canvas.height - this._uiY - entity.geometry.y;
		} else if (this._uiYAlign === 'middle') {
			entity.transform._translate.y = ige._canvasHeight2 + this._uiY;
		} else {
			entity.transform._translate.y = this._uiY;
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiPositionComponent; }