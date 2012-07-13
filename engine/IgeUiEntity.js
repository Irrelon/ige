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

		// Implement the UI extensions
		this.implement(IgeUiStyleExtension, true);
		this.implement(IgeUiPositionExtension, true);
	},

	_renderBackground: function () {
		var ctx = ige._ctx,
			geom = this.geometry,
			left, top;

		if (this._backgroundColor || this._texture) {
			left = -(geom.x / 2);// + this._uiX;
			top = -(geom.y / 2);// + this._uiY;

			ctx.save();
				ctx.beginPath();

				// Top border
				ctx.moveTo(left + this._borderTopLeftRadius, top);
				ctx.lineTo(left + this._width - this._borderTopRightRadius, top);

				// Top-right corner
				ctx.arcTo(
					left + this._width,
					top,
					left + this._width,
					top + this._borderTopRightRadius,
					this._borderTopRightRadius
				);

				// Right border
				ctx.lineTo(
					left + this._width,
					top + this._height - this._borderBottomRightRadius
				);

				// Bottom-right corner
				ctx.arcTo(
					left + this._width,
					top + this._height,
					left + this._width - this._borderBottomRightRadius,
					top + this._height, this._borderBottomRightRadius
				);

				// Bottom border
				ctx.lineTo(
					left + this._borderBottomLeftRadius,
					top + this._height
				);

				// Bottom-left corner
				ctx.arcTo(
					left,
					top + this._height,
					left,
					top + this._height - this._borderBottomLeftRadius,
					this._borderBottomLeftRadius
				);

				// Left border
				ctx.lineTo(
					left,
					top + this._borderTopLeftRadius
				);

				// Top-left corner
				ctx.arcTo(
					left,
					top,
					left + this._borderTopLeftRadius,
					top, this._borderTopLeftRadius
				);

				ctx.clip();

				// If there is a background colour, paint it here
				if (this._backgroundColor) {
					ctx.fillStyle = this._backgroundColor;
					ctx.fillRect(
						left,
						top,
						this._width,
						this._height
					);
				}

				// If there is a background image, paint it here
				if (this._texture && this._texture != 'none') {
					//ctx.drawImage(this.__image, this._uiX, top, this.__image.width, this.__image.height);
					this._texture.render(ctx, this, ige.tickDelta);
				}
			ctx.restore();
		}
	},

	_renderBorder: function (ctx, newItem) {
		var rad = Math.PI / 180;

		//this._uiX += 0.5;
		//this._uiY += 0.5;

		if (this._borderLeftWidth || this._borderTopWidth || this._borderRightWidth || this._borderBottomWidth) {
			this._uiY += (this._borderTopWidth / 2);
			this._height += (this._borderBottomWidth);

			this._uiX += (this._borderLeftWidth / 2);
			this._width += (this._borderRightWidth);
		}

		if (this._borderTopWidth) {
			// Top-left corner top-half
			ctx.strokeStyle = this._borderTopColor;
			ctx.lineWidth = this._borderTopWidth;

			ctx.beginPath();
			ctx.arc(this._uiX + this._borderTopLeftRadius, this._uiY + this._borderTopLeftRadius, this._borderTopLeftRadius, 225 * rad, 270 * rad);
			ctx.stroke();

			// Top border
			ctx.beginPath();
			ctx.moveTo(this._uiX + this._borderTopLeftRadius, this._uiY);
			ctx.lineTo(this._uiX + this._width - this._borderTopRightRadius, this._uiY);
			ctx.stroke();

			// Top-right corner top-half
			ctx.beginPath();
			ctx.arc(this._uiX + this._width - this._borderTopRightRadius, this._uiY + this._borderTopRightRadius, this._borderTopRightRadius, -90 * rad, -45 * rad);
			ctx.stroke();
		}

		if (this._borderRightWidth) {
			// Top-right corner bottom-half
			ctx.strokeStyle = this._borderRightColor;
			ctx.lineWidth = this._borderRightWidth;

			ctx.beginPath();
			ctx.arc(this._uiX + this._width - this._borderTopRightRadius, this._uiY + this._borderTopRightRadius, this._borderTopRightRadius, -45 * rad, 0 * rad);
			ctx.stroke();

			// Right border
			ctx.beginPath();
			ctx.moveTo(this._uiX + this._width, this._uiY + this._borderTopRightRadius);
			ctx.lineTo(this._uiX + this._width, this._uiY + this._height - this._borderBottomRightRadius);
			ctx.stroke();

			// Bottom-right corner top-half
			ctx.beginPath();
			ctx.arc(this._uiX + this._width - this._borderBottomRightRadius, this._uiY + this._height - this._borderBottomRightRadius, this._borderTopRightRadius, 0 * rad, 45 * rad);
			ctx.stroke();
		}

		if (this._borderBottomWidth) {
			// Bottom-right corner bottom-half
			ctx.strokeStyle = this._borderBottomColor;
			ctx.lineWidth = this._borderBottomWidth;

			ctx.beginPath();
			ctx.arc(this._uiX + this._width - this._borderBottomRightRadius, this._uiY + this._height - this._borderBottomRightRadius, this._borderBottomRightRadius, 45 * rad, 90 * rad);
			ctx.stroke();

			// Bottom border
			ctx.beginPath();
			ctx.moveTo(this._uiX + this._width - this._borderBottomRightRadius, this._uiY + this._height);
			ctx.lineTo(this._uiX + this._borderBottomLeftRadius, this._uiY + this._height);
			ctx.stroke();

			// Bottom-left corner bottom-half
			ctx.beginPath();
			ctx.arc(this._uiX + this._borderBottomLeftRadius, this._uiY + this._height - this._borderBottomLeftRadius, this._borderBottomLeftRadius, 90 * rad, 135 * rad);
			ctx.stroke();
		}

		if (this._borderBottomWidth) {
			// Bottom-left corner top-half
			ctx.strokeStyle = this._borderLeftColor;
			ctx.lineWidth = this._borderLeftWidth;

			ctx.beginPath();
			ctx.arc(this._uiX + this._borderBottomLeftRadius, this._uiY + this._height - this._borderBottomLeftRadius, this._borderBottomLeftRadius, 135 * rad, 180 * rad);
			ctx.stroke();

			// Left border
			ctx.beginPath();
			ctx.moveTo(this._uiX, this._uiY + this._height - this._borderBottomLeftRadius);
			ctx.lineTo(this._uiX, this._uiY + this._borderTopLeftRadius);
			ctx.stroke();

			// Top-left corner bottom-half
			ctx.beginPath();
			ctx.arc(this._uiX + this._borderTopLeftRadius, this._uiY + this._borderTopLeftRadius, this._borderTopLeftRadius, 180 * rad, 225 * rad);
			ctx.stroke();
		}

		if (this._borderLeftWidth || this._borderTopWidth || this._borderRightWidth || this._borderBottomWidth) {
			this._uiY -= (this._borderTopWidth / 2);
			this._height -= (this._borderBottomWidth);

			this._uiX -= (this._borderLeftWidth / 2);
			this._width -= (this._borderRightWidth);
		}
	},

	tick: function () {
		var ctx = ige._ctx,
			thisTransform = this.transform,
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

		// Translate back to the top-left of the viewport
		ctx.translate(-(thisGeometry.x * thisOrigin.x), -(thisGeometry.y * thisOrigin.y));

		// Transform the context to the center of the viewport
		ctx.translate(
			((thisGeometry.x * thisOrigin.x) | 0),
			((thisGeometry.y * thisOrigin.y) | 0)
		); // Bitwise floor
		this._renderBackground();
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