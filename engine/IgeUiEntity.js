var IgeUiEntity = IgeEntity.extend({
	init: function () {
		this._super();

		// Set some defaults
		this._uiX = 0;
		this._uiY = 0;
		this._width = 0;
		this._height = 0;
		this._borderLeftWidth = 0;
		this._borderTopWidth = 0;
		this._borderRightWidth = 0;
		this._borderBottomWidth = 0;
		this._borderTopLeftRadius = 0;
		this._borderTopRightRadius = 0;
		this._borderBottomRightRadius = 0;
		this._borderBottomLeftRadius = 0;
		this._backgroundPosition = {x: 0, y: 0};

		// Implement the UI extensions
		this.implement(IgeUiStyleExtension, true);
		this.implement(IgeUiPositionExtension, true);
	},

	_renderBackground: function (ctx) {
		var geom = this.geometry,
			left, top;

		if (this._backgroundColor || this._patternFill) {
			left = -(geom.x / 2);
			top = -(geom.y / 2);

			ctx.save();
				ctx.beginPath();

				// Check for early exit if we are rendering a rectangle
				if (!this._borderTopRightRadius && this._borderBottomRightRadius && !this._borderBottomLeftRadius && !this._borderTopLeftRadius) {
					ctx.rect(left, top, this._width, this._height);
				} else {
					// Top border
					ctx.moveTo(left + this._borderTopLeftRadius, top);
					ctx.lineTo(left + this._width - this._borderTopRightRadius, top);

					if (this._borderTopRightRadius > 0) {
						// Top-right corner
						ctx.arcTo(
							left + this._width,
							top,
							left + this._width,
							top + this._borderTopRightRadius,
							this._borderTopRightRadius
						);
					}

					// Right border
					ctx.lineTo(
						left + this._width,
						top + this._height - this._borderBottomRightRadius
					);

					if (this._borderBottomRightRadius > 0) {
						// Bottom-right corner
						ctx.arcTo(
							left + this._width,
							top + this._height,
							left + this._width - this._borderBottomRightRadius,
							top + this._height, this._borderBottomRightRadius
						);
					}

					// Bottom border
					ctx.lineTo(
						left + this._borderBottomLeftRadius,
						top + this._height
					);

					if (this._borderBottomLeftRadius > 0) {
						// Bottom-left corner
						ctx.arcTo(
							left,
							top + this._height,
							left,
							top + this._height - this._borderBottomLeftRadius,
							this._borderBottomLeftRadius
						);
					}

					// Left border
					ctx.lineTo(
						left,
						top + this._borderTopLeftRadius
					);

					if (this._borderTopLeftRadius > 0) {
						// Top-left corner
						ctx.arcTo(
							left,
							top,
							left + this._borderTopLeftRadius,
							top, this._borderTopLeftRadius
						);
					}

					ctx.clip();
				}

				// If there is a background colour, paint it here
				if (this._backgroundColor) {
					ctx.fillStyle = this._backgroundColor;
					ctx.fill();
				}

				// If there is a background image, paint it here
				if (this._patternFill) {
					ctx.translate(
						-(this._width / 2) + this._backgroundPosition.x | 0,
						-(this._height / 2) + this._backgroundPosition.y | 0
					);

					ctx.fillStyle = this._patternFill;
					ctx.fill();
				}
			ctx.restore();
		}
	},

	_renderBorder: function (ctx) {
		var rad,
			geom = this.geometry,
			left = -(geom.x / 2),
			top = -(geom.y / 2);

		// Check for early exit if we are rendering a rectangle
		if (!this._borderTopRightRadius && !this._borderBottomRightRadius && !this._borderBottomLeftRadius && !this._borderTopLeftRadius
			&& this._borderLeftWidth === this._borderWidth
			&& this._borderTopWidth === this._borderWidth
			&& this._borderRightWidth === this._borderWidth
			&& this._borderBottomWidth === this._borderWidth) {
			ctx.strokeStyle = this._borderColor;
			ctx.lineWidth = this._borderWidth;
			ctx.strokeRect(left, top, this._width, this._height);
		} else {
			rad = Math.PI / 180;
			if (this._borderTopWidth) {
				// Top-left corner top-half
				ctx.strokeStyle = this._borderTopColor;
				ctx.lineWidth = this._borderTopWidth;

				if (this._borderTopLeftRadius > 0) {
					// Top-left corner top-half
					ctx.beginPath();
						ctx.arc(left + this._borderTopLeftRadius, top + this._borderTopLeftRadius, this._borderTopLeftRadius, 225 * rad, 270 * rad);
					ctx.stroke();
				}

				// Top border
				ctx.beginPath();
				ctx.moveTo(left + this._borderTopLeftRadius, top);
				ctx.lineTo(left + this._width - this._borderTopRightRadius, top);
				ctx.stroke();

				if (this._borderTopRightRadius > 0) {
					// Top-right corner top-half
					ctx.beginPath();
						ctx.arc(left + this._width - this._borderTopRightRadius, top + this._borderTopRightRadius, this._borderTopRightRadius, -90 * rad, -45 * rad);
					ctx.stroke();
				}
			}

			if (this._borderRightWidth) {
				// Top-right corner bottom-half
				ctx.strokeStyle = this._borderRightColor;
				ctx.lineWidth = this._borderRightWidth;

				if (this._borderTopRightRadius > 0) {
					ctx.beginPath();
						ctx.arc(left + this._width - this._borderTopRightRadius, top + this._borderTopRightRadius, this._borderTopRightRadius, -45 * rad, 0 * rad);
					ctx.stroke();
				}

				// Right border
				ctx.beginPath();
				ctx.moveTo(left + this._width, top + this._borderTopRightRadius);
				ctx.lineTo(left + this._width, top + this._height - this._borderBottomRightRadius);
				ctx.stroke();

				if (this._borderBottomRightRadius > 0) {
					// Bottom-right corner top-half
					ctx.beginPath();
						ctx.arc(left + this._width - this._borderBottomRightRadius, top + this._height - this._borderBottomRightRadius, this._borderTopRightRadius, 0 * rad, 45 * rad);
					ctx.stroke();
				}
			}

			if (this._borderBottomWidth) {
				// Bottom-right corner bottom-half
				ctx.strokeStyle = this._borderBottomColor;
				ctx.lineWidth = this._borderBottomWidth;

				if (this._borderBottomRightRadius > 0) {
					ctx.beginPath();
						ctx.arc(left + this._width - this._borderBottomRightRadius, top + this._height - this._borderBottomRightRadius, this._borderBottomRightRadius, 45 * rad, 90 * rad);
					ctx.stroke();
				}

				// Bottom border
				ctx.beginPath();
				ctx.moveTo(left + this._width - this._borderBottomRightRadius, top + this._height);
				ctx.lineTo(left + this._borderBottomLeftRadius, top + this._height);
				ctx.stroke();

				if (this._borderBottomLeftRadius > 0) {
					// Bottom-left corner bottom-half
					ctx.beginPath();
						ctx.arc(left + this._borderBottomLeftRadius, top + this._height - this._borderBottomLeftRadius, this._borderBottomLeftRadius, 90 * rad, 135 * rad);
					ctx.stroke();
				}
			}

			if (this._borderBottomWidth) {
				// Bottom-left corner top-half
				ctx.strokeStyle = this._borderLeftColor;
				ctx.lineWidth = this._borderLeftWidth;

				if (this._borderBottomLeftRadius > 0) {
					ctx.beginPath();
						ctx.arc(left + this._borderBottomLeftRadius, top + this._height - this._borderBottomLeftRadius, this._borderBottomLeftRadius, 135 * rad, 180 * rad);
					ctx.stroke();
				}

				// Left border
				ctx.beginPath();
				ctx.moveTo(left, top + this._height - this._borderBottomLeftRadius);
				ctx.lineTo(left, top + this._borderTopLeftRadius);
				ctx.stroke();

				if (this._borderTopLeftRadius > 0) {
					// Top-left corner bottom-half
					ctx.beginPath();
						ctx.arc(left + this._borderTopLeftRadius, top + this._borderTopLeftRadius, this._borderTopLeftRadius, 180 * rad, 225 * rad);
					ctx.stroke();
				}
			}
		}
	},

	tick: function (ctx) {
		var thisTransform = this.transform,
			thisTranslate = thisTransform._translate,
			thisRotate = thisTransform._rotate,
			thisScale = thisTransform._scale,
			thisOrigin = thisTransform._origin,
			thisGeometry = this.geometry;

		// Translate the whole context back to the top-left of the viewport
		ctx.translate(-(ige._canvasWidth2), -(ige._canvasHeight2));

		// Transform the context by the current transform settings
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

		this._renderBackground(ctx);
		this._renderBorder(ctx);
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		this._updateTranslation();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiEntity; }