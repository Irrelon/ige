// TODO: Make the mouse events inactive on tilemaps, instead allow behaviours to be added that call the mouseToTile method and can do things based on that. This solves the problem of tilemaps having arbitrary infinite bounds and allows the programmer to decide which tile maps are being interacted with.
// TODO: Implement the _stringify() method for this class
/**
 * Tile maps provide a way to align mounted child objects to a tile-based grid.
 * NOTE: These are not to be confused with IgeTextureMap's which allow you to
 * paint a bunch of tiles to a grid.
 */
var IgeTileMapStack2d = IgeEntity.extend({
	classId: 'IgeTileMapStack2d',

	init: function (tileWidth, tileHeight) {
		IgeEntity.prototype.init.call(this);
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
		obj.occupyTile = this._objectOccupyTile;
		obj.unOccupyTile = this._objectUnOccupyTile;
		obj.overTiles = this._objectOverTiles;

		IgeEntity.prototype._childMounted.call(this, obj);
	},

	/**
	 * Attached to objects that are mounted to the tile sheet. Adds the
	 * object to the tile map at the passed tile co-ordinates. If no tile
	 * co-ordinates are passed, will use the array returned from calling
	 * overTiles() and will add the object to each tile the object is "over".
	 * @param {Number=} x
	 * @param {Number=} y
	 * @param {Number=} width
	 * @param {Number=} height
	 * @private
	 */
	_objectOccupyTile: function (x, y, width, height) {
		if (x !== undefined && y !== undefined) {
			this._parent.occupyTile(x, y, width, height, this);
		} else {
			// Occupy tiles based upon the response from overTiles();
			var tileArr = this.overTiles();
		}
		return this;
	},

	/**
	 * Attached to objects that are mounted to the tile sheet. Removes the
	 * object from the tile map at the passed tile co-ordinates. If no tile
	 * co-ordinates are passed, will use the array returned from calling
	 * overTiles() and will remove the object from each tile the object is "over".
	 * @param {Number=} x
	 * @param {Number=} y
	 * @param {Number=} width
	 * @param {Number=} height
	 * @private
	 */
	_objectUnOccupyTile: function (x, y, width, height) {
		if (x !== undefined && y !== undefined) {
			this._parent.unOccupyTile(x, y, width, height);
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
	 * as well as it's 3d geometry.
	 * @private
	 * @return {Array} The array of tile co-ordinates as IgePoint instances.
	 */
	_objectOverTiles: function () {
		if (this._tileWidth && this._tileHeight) {
			var x, y;
			for (x = 0; x < this._tileWidth; x++) {
				for (y = 0; y < this._tileHeight; y++) {
					// TODO: // Finish writing this!
				}
			}
		} else {
			this.log('Cannot calculate which tiles this entity is currently "over" because it has not been assigned either a tileWidth or a tileHeight.', 'error');
		}
	},

	_resizeEvent: function (event) {
		this._geometry = this._parent._geometry.clone();
		IgeEntity.prototype._resizeEvent.call(this, event);
	},

	/**
	 * Sets a tile or area as occupied by the passed obj parameter.
	 * Any previous data on the specified tile or area will be removed.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} width
	 * @param {Number} height
	 * @param {*} obj
	 * @return {*}
	 */
	occupyTile: function (x, y, width, height, obj) {
		var xi, yi;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		// Floor the values
		x = Math.floor(x);
		y = Math.floor(y);
		width = Math.floor(width);
		height = Math.floor(height);

		if (x !== undefined && y !== undefined) {
			for (xi = 0; xi < width; xi++) {
				for (yi = 0; yi < height; yi++) {
					this.map.tileData(x + xi, y + yi, obj);
				}
			}
		}
		return this;
	},

	/**
	 * Removes all data from the specified tile or area.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number=} width
	 * @param {Number=} height
	 * @return {*}
	 */
	unOccupyTile: function (x, y, width, height) {
		var xi, yi;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		// Floor the values
		x = Math.floor(x);
		y = Math.floor(y);
		width = Math.floor(width);
		height = Math.floor(height);

		if (x !== undefined && y !== undefined) {
			for (xi = 0; xi < width; xi++) {
				for (yi = 0; yi < height; yi++) {
					this.map.clearData(x + xi, y + yi);
				}
			}
		}
		return this;
	},

	/**
	 * Returns true if the specified tile or tile area has
	 * an occupied status.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number=} width
	 * @param {Number=} height
	 * @return {*}
	 */
	isTileOccupied: function (x, y, width, height) {
		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		return this.map.collision(x, y, width, height);
	},

	mouseDown: function (val) {
		if (val !== undefined) {
			this._tileMapMouseDown = val;
			return this;
		}

		return this._tileMapMouseDown;
	},

	mouseUp: function (val) {
		if (val !== undefined) {
			this._tileMapMouseUp = val;
			return this;
		}

		return this._tileMapMouseUp;
	},

	mouseOver: function (val) {
		if (val !== undefined) {
			this._tileMapMouseOver = val;
			return this;
		}

		return this._tileMapMouseOver;
	},

	/**
	 * Returns the tile co-ordinates of the tile that the point's world
	 * co-ordinates reside inside.
	 * @param point
	 * @return {*}
	 */
	pointToTile: function (point) {
		// TODO: Could this do with some caching to check if the input values have changed and if not, supply the same pre-calculated data if it already exists?
		var mx = point.x,
			my = point.y,
			dx, dy, tilePos;

		if (this._mountMode === 0) {
			// 2d
			dx = mx + this._tileWidth / 2;
			dy = my + this._tileHeight / 2;

			tilePos = new IgePoint(
				Math.floor(dx / this._tileWidth),
				Math.floor(dy / this._tileWidth)
			);
		}

		if (this._mountMode === 1) {
			// iso
			dx = mx;
			dy = my - this._tileHeight / 2;

			tilePos = new IgePoint(
				dx,
				dy,
				0
			).to2d();

			tilePos = new IgePoint(
				Math.floor(tilePos.x / this._tileWidth) + 1,
				Math.floor(tilePos.y / this._tileHeight) + 1
			);
		}

		return tilePos;
	},

	/**
	 * Returns the world co-ordinates of the tile the mouse is currently over.
	 * @return {IgePoint}
	 */
	mouseTileWorldXY: function () {
		if (this._mountMode === 0) {
			return this._mouseTilePos
				.clone()
				.thisMultiply(this._tileWidth, this._tileHeight, 0);
		}

		if (this._mountMode === 1) {
			return this._mouseTilePos
				.clone()
				.thisMultiply(this._tileWidth, this._tileHeight, 0)
				.thisToIso();
		}
	},

	/**
	 * Returns the tile co-ordinates of the tile the mouse is currently over.
	 * @return {IgePoint}
	 */
	mouseToTile: function () {
		return this.pointToTile(this.mousePos());
	},

	/**
	 * Sets the internal mouse position data based on the current mouse position
	 * relative to the tile map.
	 * @private
	 */
	_calculateMousePosition: function () {
		this._mouseTilePos = this.pointToTile(this.mousePos());
	},

	tick: function (ctx) {
		this._calculateMousePosition();

		// Now check if we have any mouse events to call
		if (ige.input.mouseMove && this._tileMapMouseOver) {
			this._tileMapMouseOver(this._mouseTilePos.x, this._mouseTilePos.y);
		}

		if (ige.input.mouseDown && this._tileMapMouseDown) {
			this._tileMapMouseDown(this._mouseTilePos.x, this._mouseTilePos.y);
		}

		if (ige.input.mouseUp && this._tileMapMouseUp) {
			this._tileMapMouseUp(this._mouseTilePos.x, this._mouseTilePos.y);
		}

		// Transform the context ready for drawing
		this._transformContext(ctx);

		// Check if we need to draw the tile grid (usually for debug)
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

				if (this._mountMode === 1) {
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

				if (this._mountMode === 1) {
					// Iso grid
					gStart = gStart.toIso();
					gEnd = gEnd.toIso();
				}

				ctx.beginPath();
				ctx.moveTo(gStart.x, gStart.y);
				ctx.lineTo(gEnd.x, gEnd.y);
				ctx.stroke();
			}
		}

		if (this._highlightOccupied) {
			ctx.fillStyle = '#ff0000';
			for (y = 0; y < this.map._mapData.length; y++) {
				if (this.map._mapData[y]) {
					for (x = 0; x < this.map._mapData[y].length; x++) {
						if (this.map._mapData[y][x] && this.map._mapData[y][x].length) {
							// Tile is occupied
							tilePoint = new IgePoint(tileWidth * x, tileHeight * y, 0);

							// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
							if (this._mountMode === 0) {
								// 2d
								ctx.fillRect(
									tilePoint.x - tileWidth / 2,
									tilePoint.y - tileHeight / 2,
									tileWidth,
									tileHeight
								);
							}

							if (this._mountMode === 1) {
								// iso
								tilePoint.thisToIso();

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
		}

		if (this._drawMouse) {
			// Paint the tile the mouse is currently intersecting
			ctx.fillStyle = '#6000ff';
			if (this._mountMode === 0) {
				// 2d
				ctx.fillRect(
					(this._mouseTilePos.x * tileWidth) - tileWidth / 2,
					(this._mouseTilePos.y * tileHeight) - tileHeight / 2,
					tileWidth,
					tileHeight
				);
			}

			if (this._mountMode === 1) {
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

		IgeEntity.prototype.tick.call(this, ctx, true);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTileMapStack2d; }