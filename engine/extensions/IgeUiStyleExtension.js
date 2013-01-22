// TODO: Add "overflow" with automatic scroll-bars
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

			if (this._cell > 1) {
				// We are using a cell sheet, render the cell to a
				// temporary canvas and set that as the pattern image
				var canvas = document.createElement('canvas'),
					ctx = canvas.getContext('2d'),
					cellData = texture._cells[this._cell];

				canvas.width = cellData[2];
				canvas.height = cellData[3];

				ctx.drawImage(
					texture.image,
					cellData[0],
					cellData[1],
					cellData[2],
					cellData[3],
					0,
					0,
					cellData[2],
					cellData[3]
				);

				// Create the pattern from the texture cell
				this._patternFill = ige._ctx.createPattern(canvas, repeatType);
			} else {
				// Create the pattern from the texture
				this._patternFill = ige._ctx.createPattern(texture.image, repeatType);
			}

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
				x = this._geometry.x / 100 * parseInt(x, 10);
			}

			if (typeof(y) === 'string') {
				// Work out the actual size in pixels
				// from the percentage
				y = this._geometry.y / 100 * parseInt(y, 10);
			}
			
			if (x !== 0 && y !== 0) {
				this._backgroundSize = {x: x, y: y};
	
				// Reset the background image
				if (this._patternTexture && this._patternRepeat) {
					this.backgroundImage(this._patternTexture, this._patternRepeat);
				}
				this.dirty(true);
			} else {
				this.log('Cannot set background to zero-sized x or y!', 'error');
			}
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

	borderLeftColor: function (color) {
		if (color !== undefined) {
			this._borderLeftColor = color;
			this.dirty(true);
			return this;
		}

		return this._borderLeftColor;
	},

	borderTopColor: function (color) {
		if (color !== undefined) {
			this._borderTopColor = color;
			this.dirty(true);
			return this;
		}

		return this._borderTopColor;
	},

	borderRightColor: function (color) {
		if (color !== undefined) {
			this._borderRightColor = color;
			this.dirty(true);
			return this;
		}

		return this._borderRightColor;
	},

	borderBottomColor: function (color) {
		if (color !== undefined) {
			this._borderBottomColor = color;
			this.dirty(true);
			return this;
		}

		return this._borderBottomColor;
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

	borderLeftWidth: function (px) {
		if (px !== undefined) {
			this._borderLeftWidth = px;
			this.dirty(true);
			return this;
		}

		return this._borderLeftWidth;
	},

	borderTopWidth: function (px) {
		if (px !== undefined) {
			this._borderTopWidth = px;
			this.dirty(true);
			return this;
		}

		return this._borderTopWidth;
	},

	borderRightWidth: function (px) {
		if (px !== undefined) {
			this._borderRightWidth = px;

			this.dirty(true);
			return this;
		}

		return this._borderRightWidth;
	},

	borderBottomWidth: function (px) {
		if (px !== undefined) {
			this._borderBottomWidth = px;

			this.dirty(true);
			return this;
		}

		return this._borderBottomWidth;
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
	},

	padding: function (left, top, right, bottom) {
		this._paddingLeft = left;
		this._paddingTop = top;
		this._paddingRight = right;
		this._paddingBottom = bottom;

		this.dirty(true);
		return this;
	},

	paddingLeft: function (px) {
		if (px !== undefined) {
			this._paddingLeft = px;

			this.dirty(true);
			return this;
		}

		return this._paddingLeft;
	},

	paddingTop: function (px) {
		if (px !== undefined) {
			this._paddingTop = px;

			this.dirty(true);
			return this;
		}

		return this._paddingTop;
	},

	paddingRight: function (px) {
		if (px !== undefined) {
			this._paddingRight = px;

			this.dirty(true);
			return this;
		}

		return this._paddingRight;
	},

	paddingBottom: function (px) {
		if (px !== undefined) {
			this._paddingBottom = px;

			this.dirty(true);
			return this;
		}

		return this._paddingBottom;
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiStyleExtension; }