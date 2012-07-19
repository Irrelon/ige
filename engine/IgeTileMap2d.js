var IgeTileMap2d = IgeInteractiveEntity.extend({
	init: function (tileWidth, tileHeight) {
		this._super();
		var self = this;

		this.map = new IgeMapStack2d();

		this._tileWidth = tileWidth !== undefined ? tileWidth : 40;
		this._tileHeight = tileHeight !== undefined ? tileHeight : 40;

		this._drawGrid = 0;
	},

	/**
	 * Gets / sets the number of grid cells that the tile map should paint
	 * to the context during the tick method.
	 * @param val
	 * @return {*}
	 */
	drawGrid: function (val)  {
		if (val !== undefined) {
			this._drawGrid = val;
			return this;
		}

		return this._drawGrid;
	},

	/**
	 * Gets / sets the flag that determines if the tile map will paint the
	 * occupied tiles with an overlay colour so that it is easy to spot them.
	 * @param val
	 * @return {*}
	 */
	highlightOccupied: function (val) {
		if (val !== undefined) {
			this._highlightOccupied = val;
			return this;
		}

		return this._highlightOccupied;
	},

	/**
	 * Gets / sets the map's tile width.
	 * @param {Number} val Tile width.
	 * @return {*}
	 */
	tileWidth: function (val) {
		if (val !== undefined) {
			this._tileWidth = val;
			return this;
		}

		return this._tileWidth;
	},

	/**
	 * Gets / sets the map's tile height.
	 * @param {Number} val Tile height.
	 * @return {*}
	 */
	tileHeight: function (val) {
		if (val !== undefined) {
			this._tileHeight = val;
			return this;
		}

		return this._tileHeight;
	},

	_childMounted: function (obj) {
		// Augment the child with tile powers!
		obj.translateToTile = this._objectTranslateToTile;
		obj.widthByTile = this._objectTileWidth;
		obj.heightByTile = this._objectTileHeight;
		obj.occupyTile = this._objectOccupyTile;
		obj.overTiles = this._objectOverTiles;

		this._super(obj);
	},

	/**
	 * Translate's the object to the tile co-ordinates passed.
	 * @param x
	 * @param y
	 * @private
	 */
	_objectTranslateToTile: function (x, y) {
		this.translateTo(x * this._parent._tileWidth, y * this._parent._tileHeight, this._translate.z);
		return this;
	},

	/**
	 * Set the object's width to the number of tile width's specified.
	 * @param {Number} val
	 * @param {Boolean=} lockAspect If true, sets the height according
	 * to the texture aspect ratio and the new width.
	 * @private
	 */
	_objectTileWidth: function (val, lockAspect) {
		var tileSize = this._mode === 0 ? this._parent._tileWidth : this._parent._tileWidth * 2;
		this.width(val * tileSize);

		if (lockAspect) {
			if (this._texture) {
				// Calculate the height based on the new width
				var ratio = this._texture._sizeX / this.geometry.x;
				this.height(this._texture._sizeY / ratio);
			} else {
				this.log('Cannot set height based on texture aspect ratio and new width because no texture is currently assigned to the entity!', 'error');
			}
		}

		return this;
	},

	/**
	 * Set the object's height to the number of tile height's specified.
	 * @param val
	 * @param {Boolean=} lockAspect If true, sets the height according
	 * to the texture aspect ratio and the new height.
	 * @private
	 */
	_objectTileHeight: function (val, lockAspect) {
		var tileSize = this._mode === 0 ? this._parent._tileHeight : this._parent._tileHeight * 2;
		this.height(val * tileSize);

		if (lockAspect) {
			if (this._texture) {
				// Calculate the width based on the new height
				var ratio = this._texture._sizeY / this.geometry.y;
				this.width(this._texture._sizeX / ratio);
			} else {
				this.log('Cannot set width based on texture aspect ratio and new height because no texture is currently assigned to the entity!', 'error');
			}
		}

		return this;
	},

	/**
	 * Attached to objects that are mounted to the tile sheet. Adds the
	 * object to the tile map at the passed tile co-ordinates. If no tile
	 * co-ordinates are passed, will use the array returned from calling
	 * overTiles() and will add the object to each tile the object is "over".
	 * @param {Number=} x
	 * @param {Number=} y
	 * @private
	 */
	_objectOccupyTile: function (x, y, width, height) {
		var xi, yi;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		if (x !== undefined && y !== undefined) {
			for (xi = 0; xi < width; xi++) {
				for (yi = 0; yi < height; yi++) {
					this._parent.map.tileData(x + xi, y + yi, this);
				}
			}
		} else {
			// Occupy tiles based upon the response from overTiles();
			var tileArr = this.overTiles();
		}
		return this;
	},

	/**
	 * Attached to objects that are mounted to the tile sheet. This method
	 * returns an array of tile co-ordinates that the object is currently
	 * over, calculated using the current world co-ordinates of the object
	 * as well as it's geometry.
	 * @private
	 * @return {Array} The array of tile co-ordinates as IgePoint instances.
	 */
	_objectOverTiles: function () {

	},

	tick: function (ctx) {
		// Calculate the current tile the mouse is over
		var mx = ige._mousePos.x,
			my = ige._mousePos.y,
			dx, dy;

		if (this._mode === 0) {
			// 2d
			// Calc delta
			dx = mx - this._translate.x + this._tileWidth / 2;
			dy = my - this._translate.y + this._tileHeight / 2;

			this._mouseTilePos = new IgePoint(
				Math.floor(dx / this._tileWidth),
				Math.floor(dy / this._tileWidth)
			);
		}

		if (this._mode === 1) {
			// iso
			// Calc delta
			dx = mx - this._translate.x;
			dy = my - this._translate.y - this._tileHeight / 2;

			this._mouseTilePos = new IgePoint(
				dx,
				dy,
				0
			).to2d();

			this._mouseTilePos = new IgePoint(
				Math.floor(this._mouseTilePos.x / this._tileWidth) + 1,
				Math.floor(this._mouseTilePos.y / this._tileHeight) + 1
			);
		}

		this._transformContext(ctx);

		if (this._drawGrid > 0) {
			ctx.strokeStyle = '#ffffff';
			var gridCount = this._drawGrid,
				tileWidth = this._tileWidth,
				tileHeight = this._tileHeight,
				index,
				x = -(tileWidth / 2),
				y = -(tileHeight / 2),
				gridMaxX = x + tileWidth * gridCount,
				gridMaxY = y + tileHeight * gridCount,
				gStart,
				gEnd,
				tilePoint;

			for (index = 0; index <= gridCount; index++) {
				gStart = new IgePoint(x, y + (tileHeight * index), 0);
				gEnd = new IgePoint(gridMaxX, y + (tileHeight * index), 0);

				if (this._mode === 1) {
					// Iso grid
					gStart = gStart.toIso();
					gEnd = gEnd.toIso();
				}

				ctx.beginPath();
				ctx.moveTo(gStart.x, gStart.y);
				ctx.lineTo(gEnd.x, gEnd.y);
				ctx.stroke();
			}

			for (index = 0; index <= gridCount; index++) {
				gStart = new IgePoint(x + (tileWidth * index), y, 0);
				gEnd = new IgePoint(x + (tileWidth * index), gridMaxY, 0);

				if (this._mode === 1) {
					// Iso grid
					gStart = gStart.toIso();
					gEnd = gEnd.toIso();
				}

				ctx.beginPath();
				ctx.moveTo(gStart.x, gStart.y);
				ctx.lineTo(gEnd.x, gEnd.y);
				ctx.stroke();
			}

			ctx.fillStyle = '#ff0000';
			for (x = 0; x < this.map._mapData.length; x++) {
				if (this.map._mapData[x]) {
					for (y = 0; y < this.map._mapData[x].length; y++) {
						if (this.map._mapData[x][y] && this.map._mapData[x][y].length) {
							// Tile is occupied
							tilePoint = new IgePoint(tileWidth * x, tileHeight * y, 0);
							// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
							if (this._mode === 0) {
								// 2d
								ctx.fillRect(
									tilePoint.x - tileWidth / 2,
									tilePoint.y - tileHeight / 2,
									tileWidth,
									tileHeight
								);
							}

							if (this._mode === 1) {
								// iso
								tilePoint = tilePoint.toIso();

								ctx.beginPath();
									ctx.moveTo(tilePoint.x, tilePoint.y - tileHeight / 2);
									ctx.lineTo(tilePoint.x + tileWidth, tilePoint.y);
									ctx.lineTo(tilePoint.x, tilePoint.y + tileHeight / 2);
									ctx.lineTo(tilePoint.x - tileWidth, tilePoint.y);
									ctx.lineTo(tilePoint.x, tilePoint.y - tileHeight / 2);
								ctx.fill();
							}
						}
					}
				}
			}

			// Paint the tile the mouse is currently intersecting
			if (this._mode === 0) {
				// 2d
				ctx.fillRect(
					(this._mouseTilePos.x * tileWidth) - tileWidth / 2,
					(this._mouseTilePos.y * tileHeight) - tileHeight / 2,
					tileWidth,
					tileHeight
				);
			}

			if (this._mode === 1) {
				// iso
				tilePoint = this._mouseTilePos
					.clone()
					.thisMultiply(tileWidth, tileHeight, 0)
					.thisToIso();

				ctx.beginPath();
					ctx.moveTo(tilePoint.x, tilePoint.y - tileHeight / 2);
					ctx.lineTo(tilePoint.x + tileWidth, tilePoint.y);
					ctx.lineTo(tilePoint.x, tilePoint.y + tileHeight / 2);
					ctx.lineTo(tilePoint.x - tileWidth, tilePoint.y);
					ctx.lineTo(tilePoint.x, tilePoint.y - tileHeight / 2);
				ctx.fill();
			}
		}

		this._super(ctx, true);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTileMap2d; }