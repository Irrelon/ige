// TODO: Implement the _stringify() method for this class
/**
 * Texture maps provide a way to display textures across a tile map.
 */
var IgeTextureMap = IgeTileMap2d.extend({
	classId: 'IgeTextureMap',

	init: function (tileWidth, tileHeight) {
		this._super(tileWidth, tileHeight);
		this.map = new IgeMap2d();
		this._textureList = [];
		this._renderCenter = new IgePoint(0, 0, 0);
		this._cacheDirty = true;
	},

	/**
	 * Gets / sets the caching mode.
	 * @param {Number=} val
	 * @return {*}
	 */
	caching: function (val) {
		if (val !== undefined) {
			var canvas;

			if (val === 0) {
				// Remove the cache canvas references
				delete this._cache;
				delete this._cacheCtx;
			}

			this._caching = val;

			// Check if caching is enabled
			if (this._caching > 0 && this._renderArea) {
				this._resizeCacheCanvas();
			}

			return this;
		}

		return this._caching;
	},

	/**
	 * Forces a cache redraw on the next tick.
	 */
	cacheForceFrame: function () {
		this._cacheDirty = true;
	},

	/**
	 * Adds a texture to the texture map's internal texture list so
	 * that it can be referenced via an index so that the texture map's
	 * data will be something like [[textureId, textureCell]]
	 * or a real world example: [[0, 1], [1, 1]].
	 * @param texture
	 */
	addTexture: function (texture) {
		this._textureList.push(texture);
		return this._textureList.length - 1;
	},

	/**
	 * Sets the specified tile's texture index and cell that will be used
	 * when rendering the texture map.
	 * @param x
	 * @param y
	 * @param textureIndex
	 * @param cell
	 */
	paintTile: function (x, y, textureIndex, cell) {
		if (x !== undefined && y !== undefined && textureIndex !== undefined) {
			if (cell === undefined || cell < 1) {
				cell = 1; // Set the cell default to 1
			}
			this.map.tileData(x, y, [textureIndex, cell]);
		}
	},

	/**
	 * Clears any previous tile texture and cell data for the specified
	 * tile co-ordinates.
	 * @param x
	 * @param y
	 */
	clearTile: function (x, y) {
		this.map.clearData(x, y);
	},

	_loadMapTextureLoaded: function () {
		this._loadMapTexturesLoading--;

		if (this._loadMapTexturesLoading === 0) {
			// Fire all textures loaded
			this.emit('loadMapAllTexturesLoaded');
		}
	},

	/**
	 * Reads the map data from a standard map object and fills the map
	 * with the data found.
	 * @param map
	 */
	loadMap: function (map) {
		if (map.textures) {
			// Empty the existing array
			this._textureList = [];

			// Set the number of textures we need to load
			this._loadMapTexturesLoading = map.textures.length;

			var tex = [], i,
				self = this,
				_texLoaded = function () {
					self._loadMapTextureLoaded();
				};

			// Setup a listener so we can process when all textures have finished loading
			this.on('loadMapAllTexturesLoaded', function () {
				var k;
				for (k = 0; k < map.textures.length; k++) {
					self.addTexture(tex[k]);
				}

				// Fill in the map data
				self.map.mapData(map.data);
			});

			// Loop the texture list and create each texture object
			for (i = 0; i < map.textures.length; i++) {
				// Load each texture
				eval('tex[' + i + '] = ' + map.textures[0]);
				// Listen for when the texture loads
				tex[i].on('loaded', _texLoaded);
			}
		} else {
			// Just fill in the map data
			this.map.mapData(map.data);
		}

		return this;
	},

	/**
	 * Returns a map JSON string that can be saved to a data file and loaded
	 * with the loadMap() method.
	 */
	saveMap: function () {
		// in URL format
		var textures = [], i,
			x, y,
			dataX = 0, dataY = 0,
			mapData = this.map._mapData;

		// Grab all the texture definitions
		for (i = 0; i < this._textureList.length; i++) {
			textures.push(this._textureList[i].stringify());
		}

		// Get the lowest x, y
		for (y in mapData) {
			if (mapData.hasOwnProperty(y)) {
				for (x in mapData[y]) {
					if (mapData[y].hasOwnProperty(x)) {
						if (x < dataX) {
							dataX = x;
						}

						if (y < dataY) {
							dataY = y;
						}
					}
				}
			}
		}

		return JSON.stringify({
			textures: textures,
			data: this.map.mapDataString(),
			dataXY: [dataX, dataY]
		});
	},

	/**
	 * Gets / sets the specified tile's texture index.
	 * @param x
	 * @param y
	 * @param textureIndex
	 */
	tileTextureIndex: function (x, y, textureIndex) {
		if (x !== undefined && y !== undefined) {
			var obj = this.map.tileData(x, y);
			if (textureIndex !== undefined) {
				// Set the cell
				obj[0] = textureIndex;
			} else {
				return obj[0];
			}
		}
	},

	/**
	 * Gets / sets the specified tile's texture cell.
	 * @param x
	 * @param y
	 * @param cell
	 */
	tileTextureCell: function (x, y, cell) {
		if (x !== undefined && y !== undefined) {
			var obj = this.map.tileData(x, y);
			if (cell !== undefined) {
				// Set the cell
				obj[1] = cell;
			} else {
				return obj[1];
			}
		}
	},

	convertOldData: function (mapData) {
		var newData = [],
			x, y;

		for (x in mapData) {
			if (mapData.hasOwnProperty(x)) {
				for (y in mapData[x]) {
					if (mapData[x].hasOwnProperty(y)) {
						// Grab the tile data to paint
						newData[y] = newData[y] || [];
						newData[y][x] = mapData[x][y];
					}
				}
			}
		}

		console.log(JSON.stringify(newData));
	},

	/**
	 * Gets / sets the area of the texture map that will be rendered
	 * during the render tick. When initially set you must provide a
	 * width and height but afterwards you can just pass and x, y to
	 * effectively "move" the rendering rectangle around the map.
	 * @param x
	 * @param y
	 * @param width
	 * @param height
	 * @return {*}
	 */
	renderArea: function (x, y, width, height) {
		var updated = false;
		if (this._renderArea) {
			if (x !== undefined) { this._renderArea[0] = x; updated = true; }
			if (y !== undefined) { this._renderArea[1] = y; updated = true; }
			if (width !== undefined) { this._renderArea[2] = width; updated = true; }
			if (height !== undefined) { this._renderArea[3] = height; updated = true; }
		} else {
			if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
				this._renderArea = [x, y, width, height];
				updated = true;
			}
		}

		if (updated) {
			return this;
		} else {
			return this._renderArea;
		}
	},

	renderAreaAutoSize: function (val, options) {
		if (val !== undefined) {
			this._renderAreaAutoSize = val;
			this._renderAreaAutoSizeOptions = options;
			return this;
		}

		return this._renderAreaAutoSize;
	},

	renderCenter: function (x, y) {
		if (x !== undefined && y !== undefined) {
			if (!this._renderCenter || this._renderCenter.x !== x || this._renderCenter.y !== y) {
				this._renderCenter = new IgePoint(x, y, 0);
				this._cacheDirty = true;
			}
			return this;
		}

		return this._renderCenter;
	},

	/**
	 * Get / sets the entity that will be used to determine the
	 * center point of the map's render area. This allows the
	 * render area to become dynamic based on this entity's position.
	 * @param entity
	 * @return {*}
	 */
	trackTranslate: function (entity) {
		if (entity !== undefined) {
			this._trackTranslateTarget = entity;
			return this;
		}

		return this._trackTranslateTarget;
	},

	/**
	 * Stops tracking the current tracking target's translation.
	 */
	unTrackTranslate: function () {
		delete this._trackTranslateTarget;
	},

	/**
	 * Handles rendering the texture map during engine tick events.
	 * @param ctx
	 */
	tick: function (ctx) {
		// TODO: This is being called at the wrong time, drawing children before this parent! FIX THIS
		// Run the IgeTileMap2d tick method
		this._super(ctx);

		// Draw each image that has been defined on the map
		var mapData = this.map._mapData,
			renderArea = this._renderArea,
			x, y,
			tileData, tileEntity = this._newTileEntity(), // TODO: This is wasteful, cache it?
			entTranslate,
			cacheCanvas, cacheContext;

		if (!renderArea) {
			// Render the whole map
			for (y in mapData) {
				if (mapData.hasOwnProperty(y)) {
					for (x in mapData[y]) {
						if (mapData[y].hasOwnProperty(x)) {
							// Grab the tile data to paint
							tileData = mapData[y][x];

							if (tileData) {
								this._renderTile(ctx, x, y, tileData, tileEntity);
							}
						}
					}
				}
			}
		} else {
			// Check if we are tracking an entity that is used to
			// set the center point of the render area
			if (this._trackTranslateTarget) {
				// Calculate which tile our character is currently "over"
				if (this._trackTranslateTarget.isometric() === true) {
					entTranslate = this._trackTranslateTarget._translate.toIso();
				} else {
					entTranslate = this._trackTranslateTarget._translate;
				}

				this.renderCenter(entTranslate.x, entTranslate.y);
			}

			//document.getElementById('debug').innerHTML = entTranslate.x + ', ' + entTranslate.y + ', ' + this._cacheDirty;

			// Check if we have dirty cache and if not, just render the cache!
			if (this._caching > 0) {
				if (this._cacheDirty) {
					if (this._caching === 1 && this._cache && this._cache[0]) {
						// Mode 1, just a single central canvas
						cacheCanvas = this._cache[0];
						cacheContext = this._cacheCtx[0];

						// Clear the canvas
						this._cacheCtx[0].clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);

						// Adjust context
						cacheContext.save();
						cacheContext.translate((cacheCanvas.width / 2) - this._renderCenter.x, (cacheCanvas.height / 2) - this._renderCenter.y);

						// Draw the new data to the cache canvas
						this._renderMap(this._cacheCtx[0], tileEntity, mapData, renderArea);

						cacheContext.restore();
						// Draw the cached data to the main canvas
						this._renderMapCache(ctx, 0, renderArea);

						// Set the cache to clean
						this._cacheDirty = false;
					}
				} else {
					// Draw the cached data to the main canvas context
					this._renderMapCache(ctx, 0, renderArea);
					this._cacheDirty = false;
				}
			} else {
				this._renderMap(ctx, tileEntity, mapData, renderArea);
			}
		}
	},

	_renderMapCache: function (ctx, index, renderArea) {
		if (index === 0) {
			ctx.drawImage(this._cache[index], -(renderArea[2] / 2) + this._renderCenter.x, -(renderArea[3] / 2) + this._renderCenter.y);
		}
	},

	_renderMap: function (ctx, tileEntity, mapData, renderArea) {
		var renderCenter = this._renderCenter,
			currentTile = this.pointToTile(this._renderCenter),
			renderX = currentTile.x,
			renderY = currentTile.y,
			renderWidth = Math.ceil(renderArea[2] / this._tileWidth),
			renderHeight = Math.ceil(renderArea[3] / this._tileHeight),
			rect = new IgeRect(renderArea[0] + renderCenter.x, renderArea[1] + renderCenter.y, renderArea[2], renderArea[3]),
			x, y,
			tileData,
			renderSize,
			ratio;

		// Generate the bounds rectangle
		if (this._drawBounds) {
			ctx.strokeStyle = '#ff0000';
			ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
		}
		rect.x -= (this._tileWidth);
		rect.y -= (this._tileHeight / 2);
		rect.width += (this._tileWidth * 2);
		rect.height += (this._tileHeight);

		// Check if we are rendering in 2d or isometric mode
		if (this._mountMode === 0) {
			// 2d
			// Render an area of the map rather than the whole map
			for (y = renderY - Math.floor(renderHeight / 2) - 1; y <= renderY + Math.floor(renderHeight / 2) + 1; y++) {
				if (mapData[y]) {
					for (x = renderX - Math.floor(renderWidth / 2) - 1; x <= renderX + Math.floor(renderWidth / 2) + 1; x++) {
						// Grab the tile data to paint
						tileData = mapData[y][x];

						if (tileData) {
							this._renderTile(ctx, x, y, tileData, tileEntity, rect);
						}
					}
				}
			}
		}

		if (this._mountMode === 1) {
			renderSize = Math.abs(renderWidth) > Math.abs(renderHeight) ? renderWidth : renderHeight;
			ratio = 1;

			// Isometric
			// Render an area of the map rather than the whole map
			for (y = renderY - Math.floor(renderSize * ratio); y <= renderY + Math.floor(renderSize * ratio); y++) {
				if (mapData[y]) {
					for (x = renderX - Math.floor(renderSize * ratio); x <= renderX + Math.floor(renderSize * ratio); x++) {
						// Grab the tile data to paint
						tileData = mapData[y][x];

						if (tileData) {
							this._renderTile(ctx, x, y, tileData, tileEntity, rect);
						}
					}
				}
			}
		}
	},

	/**
	 * Renders a tile texture based on data from the texture map.
	 * @param ctx
	 * @param x
	 * @param y
	 * @param tileData
	 * @param tileEntity
	 * @private
	 */
	_renderTile: function (ctx, x, y, tileData, tileEntity, rect) {
		var finalX, finalY;

		// Translate the canvas to the tile position
		if (this._mountMode === 0) {
			finalX = x * this._tileWidth;
			finalY = y * this._tileHeight;
		}

		if (this._mountMode === 1) {
			// Convert the tile x, y to isometric
			tx = x * this._tileWidth;
			ty = y * this._tileHeight;
			sx = tx - ty;
			sy = (tx + ty) * 0.5;

			finalX = sx;
			finalY = sy;
		}

		// If we have a rectangle region we are limiting to...
		if (rect) {
			// Check the bounds first
			if (!rect.xyInside(finalX, finalY)) {
				// The point is not inside the bounds, return
				return;
			}
		}

		ctx.save();
		ctx.translate(finalX, finalY);

		// Set the correct texture data
		texture = this._textureList[tileData[0]];
		tileEntity._cell = tileData[1];

		// Paint the texture
		texture.render(ctx, tileEntity, ige.tickDelta);
		ctx.restore();
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		// Set width / height of scene to match main ige (SCENES ARE ALWAYS THE FULL IGE SIZE!!)
		if (this._renderAreaAutoSize) {
			var geom = this._parent.geometry,
				additionX = 0, additionY = 0;

			if (this._renderAreaAutoSizeOptions) {
				if (this._renderAreaAutoSizeOptions.bufferMultiple) {
					additionX = (geom.x * this._renderAreaAutoSizeOptions.bufferMultiple.x) - geom.x;
					additionY = (geom.y * this._renderAreaAutoSizeOptions.bufferMultiple.y) - geom.y;
				}

				if (this._renderAreaAutoSizeOptions.bufferPixels) {
					additionX = this._renderAreaAutoSizeOptions.bufferPixels.x;
					additionY = this._renderAreaAutoSizeOptions.bufferPixels.y;
				}
			}
			this.renderArea(-Math.floor((geom.x + additionX) / 2), -Math.floor((geom.y + additionY) / 2), geom.x + additionX, geom.y + additionY);

			// Check if caching is enabled
			if (this._caching > 0) {
				this._resizeCacheCanvas();
			}
		}

		this._super(event);
	},

	/**
	 * Resizes the cache canvas elements to the new
	 * render area size.
	 * @private
	 */
	_resizeCacheCanvas: function () {
		var i;

		/*if (this._cache) {
			for (i = 0; i < this._cache.length; i++) {
				document.body.removeChild(this._cache[i]);
			}
		}*/

		switch (this._caching) {
			case 1:
				// Turn on caching
				this._cache = [];
				this._cacheCtx = [];
				this._cacheDirty = true;

				// Create a new canvas to cache image render data to
				canvas = document.createElement('canvas');

				// Set the canvas size to the render area rectangle
				canvas.width = this._renderArea[2];
				canvas.height = this._renderArea[3];

				//document.body.appendChild(canvas);
				canvas.style.position = 'absolute';
				canvas.style.left = '0px';
				canvas.style.top = '0px';
				canvas.style.opacity = '0';

				this._cache.push(canvas);
				this._cacheCtx.push(canvas.getContext('2d'));
				break;
		}
	},

	/**
	 * Creates an entity object that a texture can use to render itself.
	 * This is basically a dummy object that has the minimum amount of data
	 * in it that a texture requires to render such as geometry, texture
	 * cell and rendering position.
	 * @return {Object}
	 * @private
	 */
	_newTileEntity: function () {
		if (this._mountMode === 0) {
			return {
				_cell: 1,
				geometry: {
					x: this._tileWidth,
					y: this._tileHeight
				},
				_renderPos: {
					x: -this._tileWidth / 2,
					y: -this._tileHeight / 2
				}
			};
		}

		if (this._mountMode === 1) {
			return {
				_cell: 1,
				geometry: {
					x: this._tileWidth * 2,
					y: this._tileHeight
				},
				_renderPos: {
					x: -this._tileWidth,
					y: -this._tileHeight / 2
				}
			};
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTextureMap; }