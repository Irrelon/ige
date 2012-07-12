var IgeViewport = IgeEntity.extend({
	classId: 'IgeViewport',

	init: function (options) {
		this._super();

		// Setup default objects
		//this.transform = new IgeTransform();
		this.geometry = new IgePoint(options.width || 250, options.height || 150, 0);
		this.camera = new IgeTransform();

		this.addComponent(IgeUiPositionComponent);

		// Move the viewport into position
		if (options.left !== undefined) {
			this.uiPosition.left(options.left);
		}

		if (options.center !== undefined) {
			this.uiPosition.center(options.center);
		}

		if (options.right !== undefined) {
			this.uiPosition.right(options.right);
		}

		if (options.top !== undefined) {
			this.uiPosition.top(options.top);
		}

		if (options.middle !== undefined) {
			this.uiPosition.middle(options.middle);
		}

		if (options.bottom !== undefined) {
			this.uiPosition.bottom(options.bottom);
		}

		// Set autoSize flag
		this.autoSize(options.autoSize);

		// Set the border style
		this.borderStyle(options.borderStyle);
	},

	/**
	 * Gets / sets the border style for the viewport.
	 * @param {String} val
	 * @return {String}
	 */
	borderStyle: function (val) {
		if (val !== undefined) {
			this._border = val;
			ige.clearCanvas();
		}

		return this._border;
	},

	/**
	 * Gets / sets the auto-size property. If set to true, the viewport will
	 * automatically resize to fill the entire scene.
	 * @param val
	 * @return {Boolean}
	 */
	autoSize: function (val) {
		if (typeof(val) !== 'undefined') {
			this._autoSize = val;
		}

		return this._autoSize;
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function () {
		var thisTransform = this.transform,
			thisTranslate = thisTransform._translate,
			thisRotate = thisTransform._rotate,
			thisScale = thisTransform._scale,
			thisOrigin = thisTransform._origin,
			thisGeometry = this.geometry,
			camTransform = this.camera,
			camX = camTransform._translate.x,
			camY = camTransform._translate.y,
			ctx = ige._ctx;

		// Transform the context to the center of the viewport
		ctx.translate(
			thisTranslate.x + (
				thisGeometry.x * thisOrigin.x
			),
			thisTranslate.y + (
				thisGeometry.y * thisOrigin.y
			)
		);
		ctx.rotate(thisRotate.z);
		ctx.scale(thisScale.x, thisScale.y);
		ctx.translate(-(thisGeometry.x * thisOrigin.x), -(thisGeometry.y * thisOrigin.y));

		ctx.clearRect(
			0,
			0,
			thisGeometry.x,
			thisGeometry.y
		);

		// Process the tick method up the class chain
		this._super(true);

		// Clear the canvas where the viewport will be drawn
		/*ctx.clearRect(
			thisTranslate.x,
			thisTranslate.y,
			thisGeometry.x,
			thisGeometry.y
		);*/

		// Clip the context so we only draw "inside" the viewport area
		ctx.beginPath();
			ctx.rect(
				0,
				0,
				thisGeometry.x,
				thisGeometry.y
			);

			// Paint a border if required
			if (this._border) {
				ctx.strokeStyle = this._border;
				ctx.stroke();
			}
		ctx.clip();

		// Transform the context to the center of the viewport
		ctx.translate(
			((thisGeometry.x * camTransform._origin.x) - camX | 0),
			((thisGeometry.y * camTransform._origin.y) - camY | 0)
		); // Bitwise floor
		ctx.rotate(camTransform._rotate.z);
		ctx.scale(camTransform._scale.x, camTransform._scale.y);
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		if (this._autoSize) {
			this.geometry.x = ige._canvas.width;
			this.geometry.y = ige._canvas.height;
		}

		this.uiPosition._updateTranslation();
	}
});