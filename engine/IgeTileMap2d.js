var IgeTileMap2d = IgeEntity.extend({
	init: function (tileWidth, tileHeight) {
		this._super();
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
		obj.translateToIsoTile = this._objectTranslateToIsoTile;
		obj.widthByTile = this._objectTileWidth;
		obj.heightByTile = this._objectTileHeight;
		obj.widthByIsoTile = this._objectIsoTileWidth;
		obj.heightByIsoTile = this._objectIsoTileHeight;
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
	 * @param val
	 * @private
	 */
	_objectTileWidth: function (val) {
		var tileSize = this._mode === 0 ? this._parent._tileWidth : this._parent._tileWidth * 2;
		this.width(val * tileSize);
		return this;
	},

	/**
	 * Set the object's height to the number of tile height's specified.
	 * @param val
	 * @private
	 */
	_objectTileHeight: function (val) {
		var tileSize = this._mode === 0 ? this._parent._tileHeight : this._parent._tileHeight * 2;
		this.height(val * tileSize);
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
	_objectOccupyTile: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._parent.map.data(x, y, this);
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

	_visit: function (u, sortObj) {
		var arr = sortObj.adj[u],
			arrCount = arr.length,
			i, v;

		sortObj.c[u] = 1;

		for (i = 0; i < arrCount; ++i) {
			v = arr[i];

			if (sortObj.c[v] === 0) {
				sortObj.p[v] = u;
				this._visit(v, sortObj);
			}
		}

		sortObj.c[u] = 2;
		sortObj.order[sortObj.order_ind] = u;
		--sortObj.order_ind;
	},

	/**
	 * Sorts the _children array by the layer and then depth of each object.
	 */
	depthSortChildren: function () {
		// TODO: Optimise this method, it is not especially efficient at the moment!
		if (this._mode === 1) {
			// Now sort the entities by depth
			var arr = this._children,
				arrCount = arr.length,
				sortObj = {
					adj: [],
					c: [],
					p: [],
					order: [],
					order_ind: arrCount - 1
				},
				i, j;

			if (arrCount > 1) {
				for (i = 0; i < arrCount; ++i) {
					sortObj.c[i] = 0;
					sortObj.p[i] = -1;

					for (j = i + 1; j < arrCount; ++j) {
						sortObj.adj[i] = sortObj.adj[i] || [];
						sortObj.adj[j] = sortObj.adj[j] || [];

						if (arr[i]._projectionOverlap(arr[j])) {
							if (arr[i]._isBehind(arr[j])) {
								sortObj.adj[j].push(i);
							} else {
								sortObj.adj[i].push(j);
							}
						}
					}
				}

				for (i = 0; i < arrCount; ++i) {
					if (sortObj.c[i] === 0) {
						this._visit(i, sortObj);
					}
				}

				for (i = 0; i < sortObj.order.length; i++) {
					arr[sortObj.order[i]].depth(i);
				}
			}

			this._children.sort(function (a, b) {
				var layerIndex = b._layer - a._layer;

				if (layerIndex === 0) {
					// On same layer so sort by depth
					/*if (a._projectionOverlap(b)) {
						if (a._isBehind(b)) {
							return -1;
						} else {
							return 1;
						}
					}*/
					return b._depth - a._depth;
				} else {
					// Not on same layer so sort by layer
					return layerIndex;
				}
			});
		} else {
			// Now sort the entities by depth
			this._children.sort(function (a, b) {
				var layerIndex = b._layer - a._layer;

				if (layerIndex === 0) {
					// On same layer so sort by depth
					return b._depth - a._depth;
				} else {
					// Not on same layer so sort by layer
					return layerIndex;
				}
			});
		}
	},

	tick: function (ctx) {
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
				gEnd;

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
		}

		this._super(ctx, true);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTileMap2d; }