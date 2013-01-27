// TODO: Implement the _stringify() method for this class
/**
 * Creates a new UI entity. UI entities use more resources and CPU
 * than standard IgeEntity instances so only use them if an IgeEntity
 * won't do the job.
 */
var IgeUiEntity = IgeEntity.extend([
	{extension: IgeUiStyleExtension, overwrite: true},
	{extension: IgeUiPositionExtension, overwrite: true}
], {
	classId: 'IgeUiEntity',

	init: function () {
		IgeEntity.prototype.init.call(this);

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
		this._paddingLeft = 0;
		this._paddingTop = 0;
		this._paddingRight = 0;
		this._paddingBottom = 0;
	},
	
	overflow: function (val) {
		if (val !== undefined) {
			this._overflow = val;
			return this;
		}
		
		return this._overflow;
	},

	_renderBackground: function (ctx) {
		var geom = this._geometry,
			left, top, width, height;

		if (this._backgroundColor || this._patternFill) {
			left = -(geom.x / 2) | 0;
			top = -(geom.y / 2) | 0;
			width = geom.x;
			height = geom.y;

			ctx.save();
				ctx.beginPath();

				// Check for early exit if we are rendering a rectangle
				if (!this._borderTopRightRadius && this._borderBottomRightRadius && !this._borderBottomLeftRadius && !this._borderTopLeftRadius) {
					ctx.rect(left, top, width, height);
				} else {
					// Top border
					ctx.moveTo(left + this._borderTopLeftRadius, top);
					ctx.lineTo(left + width - this._borderTopRightRadius, top);

					if (this._borderTopRightRadius > 0) {
						// Top-right corner
						ctx.arcTo(
							left + width,
							top,
							left + width,
							top + this._borderTopRightRadius,
							this._borderTopRightRadius
						);
					}

					// Right border
					ctx.lineTo(
						left + width,
						top + height - this._borderBottomRightRadius
					);

					if (this._borderBottomRightRadius > 0) {
						// Bottom-right corner
						ctx.arcTo(
							left + width,
							top + height,
							left + width - this._borderBottomRightRadius,
							top + height, this._borderBottomRightRadius
						);
					}

					// Bottom border
					ctx.lineTo(
						left + this._borderBottomLeftRadius,
						top + height
					);

					if (this._borderBottomLeftRadius > 0) {
						// Bottom-left corner
						ctx.arcTo(
							left,
							top + height,
							left,
							top + height - this._borderBottomLeftRadius,
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
						-(width / 2 | 0) + this._backgroundPosition.x,
						-(height / 2 | 0) + this._backgroundPosition.y
					);

					ctx.fillStyle = this._patternFill;
					ctx.fill();
				}
			ctx.restore();
		}
	},

	_renderBorder: function (ctx) {
		var rad,
			geom = this._geometry,
			left = -(geom.x2) | 0,
			top = -(geom.y2) | 0,
			width = geom.x,
			height = geom.y;

		// Check for early exit if we are rendering a rectangle
		if (!this._borderTopRightRadius && !this._borderBottomRightRadius && !this._borderBottomLeftRadius && !this._borderTopLeftRadius
			&& this._borderLeftWidth === this._borderWidth
			&& this._borderTopWidth === this._borderWidth
			&& this._borderRightWidth === this._borderWidth
			&& this._borderBottomWidth === this._borderWidth) {
			ctx.strokeStyle = this._borderColor;
			ctx.lineWidth = this._borderWidth;
			ctx.strokeRect(left, top, width, height);
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
				ctx.lineTo(left + width - this._borderTopRightRadius, top);
				ctx.stroke();

				if (this._borderTopRightRadius > 0) {
					// Top-right corner top-half
					ctx.beginPath();
						ctx.arc(left + width - this._borderTopRightRadius, top + this._borderTopRightRadius, this._borderTopRightRadius, -90 * rad, -45 * rad);
					ctx.stroke();
				}
			}

			if (this._borderRightWidth) {
				// Top-right corner bottom-half
				ctx.strokeStyle = this._borderRightColor;
				ctx.lineWidth = this._borderRightWidth;

				if (this._borderTopRightRadius > 0) {
					ctx.beginPath();
						ctx.arc(left + width - this._borderTopRightRadius, top + this._borderTopRightRadius, this._borderTopRightRadius, -45 * rad, 0);
					ctx.stroke();
				}

				// Right border
				ctx.beginPath();
				ctx.moveTo(left + width, top + this._borderTopRightRadius);
				ctx.lineTo(left + width, top + height - this._borderBottomRightRadius);
				ctx.stroke();

				if (this._borderBottomRightRadius > 0) {
					// Bottom-right corner top-half
					ctx.beginPath();
						ctx.arc(left + width - this._borderBottomRightRadius, top + height - this._borderBottomRightRadius, this._borderTopRightRadius, 0, 45 * rad);
					ctx.stroke();
				}
			}

			if (this._borderBottomWidth) {
				// Bottom-right corner bottom-half
				ctx.strokeStyle = this._borderBottomColor;
				ctx.lineWidth = this._borderBottomWidth;

				if (this._borderBottomRightRadius > 0) {
					ctx.beginPath();
						ctx.arc(left + width - this._borderBottomRightRadius, top + height - this._borderBottomRightRadius, this._borderBottomRightRadius, 45 * rad, 90 * rad);
					ctx.stroke();
				}

				// Bottom border
				ctx.beginPath();
				ctx.moveTo(left + width - this._borderBottomRightRadius, top + height);
				ctx.lineTo(left + this._borderBottomLeftRadius, top + height);
				ctx.stroke();

				if (this._borderBottomLeftRadius > 0) {
					// Bottom-left corner bottom-half
					ctx.beginPath();
						ctx.arc(left + this._borderBottomLeftRadius, top + height - this._borderBottomLeftRadius, this._borderBottomLeftRadius, 90 * rad, 135 * rad);
					ctx.stroke();
				}
			}

			if (this._borderLeftWidth) {
				// Bottom-left corner top-half
				ctx.strokeStyle = this._borderLeftColor;
				ctx.lineWidth = this._borderLeftWidth;

				if (this._borderBottomLeftRadius > 0) {
					ctx.beginPath();
						ctx.arc(left + this._borderBottomLeftRadius, top + height - this._borderBottomLeftRadius, this._borderBottomLeftRadius, 135 * rad, 180 * rad);
					ctx.stroke();
				}

				// Left border
				ctx.beginPath();
				ctx.moveTo(left, top + height - this._borderBottomLeftRadius);
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

	cell: function (val) {
		var ret = IgeEntity.prototype.cell.call(this, val);

		if (ret === this && this._patternTexture) {
			this.backgroundImage(
				this._patternTexture,
				this._patternRepeat
			);
		}

		return ret;
	},

	mount: function (obj) {
		var ret = IgeEntity.prototype.mount.call(this, obj);

		if (this._parent) {
			this._updateUiPosition();
		}

		return ret;
	},

	tick: function (ctx, dontTransform) {
		if (!this._hidden && this._inView && (!this._parent || (this._parent._inView)) && !this._streamJustCreated) {
			if (!dontTransform) {
				this._transformContext(ctx);
			}
			// TODO: Investigate caching expensive background and border calls
			//if (!this._cache || this._cacheDirty) {
				this._renderBackground(ctx);
				this._renderBorder(ctx);
			//}
	
			if (this._overflow === 'hidden') {
				// Limit drawing of child entities to within the bounds
				// of this one
				var geom = this._geometry,
					left = -(geom.x / 2) + this._paddingLeft | 0,
					top = -(geom.y / 2) + (this._paddingTop) | 0,
					width = geom.x + this._paddingRight,
					height = geom.y + this._paddingBottom;
	
				ctx.rect(left, top, width, height);
				//ctx.stroke();
				ctx.clip();
			}
	
			ctx.translate(this._paddingLeft, this._paddingTop);
			IgeEntity.prototype.tick.call(this, ctx, true);
		}
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		this._updateUiPosition();
		IgeEntity.prototype._resizeEvent.call(this, event);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiEntity; }