// TODO: Make the mouse events inactive on tilemaps, instead allow behaviours to be added that call the mouseToTile method and can do things based on that. This solves the problem of tilemaps having arbitrary infinite bounds and allows the programmer to decide which tile maps are being interacted with.
// TODO: Implement the _stringify() method for this class
/**
 * Tile maps provide a way to align mounted child objects to a tile-based grid.
 * NOTE: These are not to be confused with IgeTextureMap's which allow you to
 * paint a bunch of tiles to a grid.
 */
var IgeTileMap2d = IgeEntity.extend({
	classId: 'IgeTileMap2d',
	IgeTileMap2d: true,

	init: function (tileWidth, tileHeight) {
		this._alwaysInView = true;
		IgeEntity.prototype.init.call(this);

		var self = this;

		this.map = new IgeMap2d();

		this._tileWidth = tileWidth !== undefined ? tileWidth : 40;
		this._tileHeight = tileHeight !== undefined ? tileHeight : 40;

		this._drawGrid = 0;
        this._gridColor = '#ffffff';
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
	 * Gets / sets the color of the grid overlay. It can accepts a string
	 * @param val
	 * @return {*}
	 */
	gridColor: function (val)  {
		if (val !== undefined) {
			this._gridColor = val;
			return this;
		}

		return this._gridColor;
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

	highlightTileRect: function (val) {
		if (val !== undefined) {
			this._highlightTileRect = val;
			return this;
		}

		return this._highlightTileRect;
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
		/*obj.occupyTile = obj.occupyTile || this._objectOccupyTile;
		obj.unOccupyTile = obj.unOccupyTile || this._objectUnOccupyTile;
		obj.overTiles = obj.overTiles || this._objectOverTiles;*/

		// We can also re-use the tile size methods since
		// they alter the same properties on the calling
		// entity anyway.
		obj.tileWidth = obj.tileWidth || this.tileWidth;
		obj.tileHeight = obj.tileHeight || this.tileHeight;

		// Set default values
		obj._tileWidth = obj._tileWidth || 1;
		obj._tileHeight = obj._tileHeight || 1;

		IgeEntity.prototype._childMounted.call(this, obj);
	},

	_resizeEvent: function (event) {
		if (this._parent) {
			this._geometry = this._parent._geometry.clone();
		}
		IgeEntity.prototype._resizeEvent.call(this, event);
	},

	/**
	 * Sets a tile or area as occupied by the passed obj parameter.
	 * Any previous occupy data on the specified tile or area will be
	 * overwritten.
	 * @param {Number} x X co-ordinate of the tile to un-occupy.
	 * @param {Number} y Y co-ordinate of the tile to un-occupy.
	 * @param {Number} width Number of tiles along the x-axis to occupy.
	 * @param {Number} height Number of tiles along the y-axis to occupy.
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

			// Create an IgeRect to represent the tiles this
			// entity has just occupied
			if (obj._classId) {
				obj._occupiedRect = new IgeRect(x, y, width, height);
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
		var xi, yi, item;

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
					item = this.map.tileData(x + xi, y + yi);
					if (item && item._occupiedRect) {
						delete item._occupiedRect;
					}
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

	tileOccupiedBy: function (x, y) {
		return this.map.tileData(x, y);
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
	 * @param {IgePoint=} point
	 * @return {IgePoint} The tile co-ordinates as a point object.
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
	 * Scans the map data and returns an array of rectangle
	 * objects that encapsulate the map data into discrete
	 * rectangle areas.
	 * @param {Function=} callback Returns true or false for
	 * the passed map data determining if it should be included
	 * in a rectangle or not.
	 * @return {Array}
	 */
	scanRects: function (callback) {
		var x, y,
			rectArray = [],
			mapData = this.map._mapData.clone();

		// Loop the map data and scan for blocks that can
		// be converted into static box2d rectangle areas
		for (y in mapData) {
			if (mapData.hasOwnProperty(y)) {
				for (x in mapData[y]) {
					if (mapData[y].hasOwnProperty(x)) {
						if (mapData[y][x] && (!callback || (callback && callback(mapData[y][x], x, y)))) {
							rectArray.push(this._scanRects(mapData, parseInt(x, 10), parseInt(y, 10), callback));
						}
					}
				}
			}
		}

		return rectArray;
	},

	_scanRects: function (mapData, x, y, callback) {
		var rect = {
				x: x,
				y: y,
				width: 1,
				height: 1
			},
			nx = x + 1,
			ny = y + 1;

		// Clear the current x, y cell mapData
		mapData[y][x] = 0;

		while (mapData[y][nx] && (!callback || (callback && callback(mapData[y][nx], nx, y)))) {
			rect.width++;

			// Clear the mapData for this cell
			mapData[y][nx] = 0;

			// Next column
			nx++;
		}

		while (mapData[ny] && mapData[ny][x] && (!callback || (callback && callback(mapData[ny][x], x, ny)))) {
			// Check for mapData either side of the column width
			if ((mapData[ny][x - 1] && (!callback || (callback && callback(mapData[ny][x - 1], x - 1, ny)))) || (mapData[ny][x + rect.width] && (!callback || (callback && callback(mapData[ny][x + rect.width], x + rect.width, ny))))) {
				return rect;
			}

			// Loop the column's map data and check that there is
			// an intact column the same width as the starting column
			for (nx = x; nx < x + rect.width; nx++) {
				if (!mapData[ny][nx] || (callback && !callback(mapData[ny][nx], nx, ny))) {
					// This row has a different column width from the starting
					// column so return the rectangle as it stands
					return rect;
				}
			}

			// Mark the row as cleared
			for (nx = x; nx < x + rect.width; nx++) {
				mapData[ny][nx] = 0;
			}

			rect.height++;
			ny++;
		}

		return rect;
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
		var tileWidth = this._tileWidth,
			tileHeight = this._tileHeight,
			index,
			x, y,
			gridMaxX, gridMaxY,
			gStart, gEnd,
			tilePoint,
			gridCount;

		this._calculateMousePosition();

		// Now check if we have any mouse events to call
		if (ige.input.mouseMove && this._tileMapMouseOver) {
			this._tileMapMouseOver(this._mouseTilePos.x, this._mouseTilePos.y, ige.input.mouseMove);
		}

		if (ige.input.mouseDown && this._tileMapMouseDown) {
			this._tileMapMouseDown(this._mouseTilePos.x, this._mouseTilePos.y, ige.input.mouseDown);
		}

		if (ige.input.mouseUp && this._tileMapMouseUp) {
			this._tileMapMouseUp(this._mouseTilePos.x, this._mouseTilePos.y, ige.input.mouseUp);
		}

		// Transform the context ready for drawing
		this._transformContext(ctx);

		// Check if we need to draw the tile grid (usually for debug)
		if (this._drawGrid > 0) {
			ctx.strokeStyle = this._gridColor;
			gridCount = this._drawGrid;
			x = -(tileWidth / 2);
			y = -(tileHeight / 2);
			gridMaxX = x + tileWidth * gridCount;
			gridMaxY = y + tileHeight * gridCount;

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
			for (y in this.map._mapData) {
				if (this.map._mapData[y]) {
					for (x in this.map._mapData[y]) {
						if (this.map._mapData[y][x]) {
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

		if (this._highlightTileRect) {
			ctx.fillStyle = '#e4ff00';
			for (y = this._highlightTileRect.y; y < this._highlightTileRect.y + this._highlightTileRect.height; y++) {
				for (x = this._highlightTileRect.x; x < this._highlightTileRect.x + this._highlightTileRect.width; x++) {
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

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTileMap2d; }
