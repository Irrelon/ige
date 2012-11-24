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
	 * Gets / sets the auto sectioning mode. If enabled the texture map
	 * will render to off-screen canvases in sections denoted by the
	 * number passed. For instance if you pass 10, the canvas sections
	 * will be 10x10 tiles in size.
	 * @param {Number=} val The size in tiles of each section.
	 * @return {*}
	 */
	autoSection: function (val) {
		if (val !== undefined) {
			this._autoSection = val;
			return this;
		}

		return this._autoSection;
	},

	/**
	 * Gets / sets the draw sections flag. If true the texture map will
	 * output debug lines between each section of the map when using the
	 * auto section system.
	 * @param {Number=} val The boolean flag value.
	 * @return {*}
	 */
	drawSections: function (val) {
		if (val !== undefined) {
			this._drawSections = val;
			return this;
		}

		return this._drawSections;
	},

	/**
	 * Forces a cache redraw on the next tick.
	 */
	cacheForceFrame: function () {
		this._cacheDirty = true;
	},

	negate: function (entity) {
		if (entity !== undefined) {
			var x, y,
				entityMapData = entity.map._mapData,
				thisMapData = this.map._mapData;

			for (y in entityMapData) {
				if (entityMapData.hasOwnProperty(y)) {
					for (x in entityMapData[y]) {
						if (entityMapData[y].hasOwnProperty(x)) {
							if (thisMapData[y] && thisMapData[y][x]) {
								// This map has data in the same place as the passed
								// entity's map so remove this map's data
								delete thisMapData[y][x];
							}
						}
					}
				}
			}
		}

		return this;
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
	 * Handles rendering the texture map during engine tick events.
	 * @param ctx
	 */
	tick: function (ctx) {
		// TODO: This is being called at the wrong time, drawing children before this parent! FIX THIS
		// Run the IgeTileMap2d tick method
		this._super(ctx);

		// Draw each image that has been defined on the map
		var mapData = this.map._mapData,
			x, y,
			tx, ty,
			xInt, yInt,
			finalX, finalY,
			finalPoint,
			tileData, tileEntity = this._newTileEntity(), // TODO: This is wasteful, cache it?
			sectionX, sectionY,
			tempSectionX, tempSectionY,
			_ctx,
			regions, region, i;

		if (this._autoSection > 0) {
			if (this._cacheDirty) {
				// We have a dirty cache so render the section cache
				// data first
				this._sections = [];
				this._sectionCtx = [];

				// Loop the map data
				for (y in mapData) {
					if (mapData.hasOwnProperty(y)) {
						for (x in mapData[y]) {
							if (mapData[y].hasOwnProperty(x)) {
								xInt = parseInt(x);
								yInt = parseInt(y);

								// Calculate the tile's final resting position in absolute
								// co-ordinates so we can work out which section canvas to
								// paint the tile to
								if (this._mountMode === 0) {
									finalX = xInt;
									finalY = yInt;
								}

								if (this._mountMode === 1) {
									// Convert the tile x, y to isometric
									tx = xInt * this._tileWidth;
									ty = yInt * this._tileHeight;
									finalX = (tx - ty) / this._tileWidth;
									finalY = ((tx + ty) * 0.5) / this._tileHeight;
									finalPoint = new IgePoint(finalX, finalY, 0);
									//finalPoint.thisTo2d();

									finalX = finalPoint.x;
									finalY = finalPoint.y;
								}

								// Grab the tile data to paint
								tileData = mapData[y][x];

								// Work out which section to paint to
								sectionX = Math.floor(finalX / this._autoSection);
								sectionY = Math.floor(finalY / this._autoSection);

								this._ensureSectionExists(sectionX, sectionY);

								_ctx = this._sectionCtx[sectionX][sectionY];

								if (tileData) {
									regions = this._renderTile(
										_ctx,
										xInt,
										yInt,
										tileData,
										tileEntity,
										null,
										sectionX,
										sectionY
									);

									// Check if the tile overlapped another section
									if (regions) {
										// Loop the regions and re-render the tile on the
										// other sections that it overlaps
										for (i = 0; i < regions.length; i++) {
											region = regions[i];

											tempSectionX = sectionX;
											tempSectionY = sectionY;

											if (region.x) {
												tempSectionX += region.x;
											}

											if (region.y) {
												tempSectionY += region.y;
											}

											this._ensureSectionExists(tempSectionX, tempSectionY);
											_ctx = this._sectionCtx[tempSectionX][tempSectionY];

											// TODO: Set a clipping region or create a rectangle
											// that the renderer can use to only draw the section
											// of the tile that we need. This stops dithered out
											// lines from bleeding into multi-draws

											this._renderTile(
												_ctx,
												xInt,
												yInt,
												tileData,
												tileEntity,
												null,
												tempSectionX,
												tempSectionY
											);
										}
									}
								}
							}
						}
					}
				}

				// Set the cache to clean!
				this._cacheDirty = false;
			}

			this._drawSectionsToCtx(ctx);
		} else {
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
		}
	},

	_ensureSectionExists: function (sectionX, sectionY) {
		this._sections[sectionX] = this._sections[sectionX] || [];
		this._sectionCtx[sectionX] = this._sectionCtx[sectionX] || [];

		if (!this._sections[sectionX][sectionY]) {
			this._sections[sectionX][sectionY] = document.createElement('canvas');
			this._sections[sectionX][sectionY].width = (this._tileWidth * this._autoSection);
			this._sections[sectionX][sectionY].height = (this._tileHeight * this._autoSection);

			this._sectionCtx[sectionX][sectionY] = this._sections[sectionX][sectionY].getContext('2d');

			// One-time translate the context
			this._sectionCtx[sectionX][sectionY].translate(this._tileWidth / 2, this._tileHeight / 2);
		}
	},

	_drawSectionsToCtx: function (ctx) {
		var x, y, tileData,
			sectionRenderX, sectionRenderY,
			sectionAbsX, sectionAbsY,
			sectionWidth, sectionHeight;

		// Render the map sections
		if (this._mountMode === 1) {
			// Translate the canvas for iso
			ctx.translate(-(this._tileWidth / 2), -(this._tileHeight / 2));
		}

		sectionWidth = (this._tileWidth * this._autoSection);
		sectionHeight = (this._tileHeight * this._autoSection);

		for (x in this._sections) {
			if (this._sections.hasOwnProperty(x)) {
				for (y in this._sections[x]) {
					if (this._sections[x].hasOwnProperty(y)) {
						sectionRenderX = x * (this._tileWidth * this._autoSection);
						sectionRenderY = y * (this._tileHeight * this._autoSection);
						sectionAbsX = sectionRenderX - ige._currentCamera._translate.x;
						sectionAbsY = sectionRenderY - ige._currentCamera._translate.y;

						if (this._mountMode === 1) {
							sectionAbsX -= (this._tileWidth / 2);
							sectionAbsY -= (this._tileHeight / 2);
						}

						// Check if the section is "on screen"
						if ((sectionAbsX + sectionWidth >= -this._geometry.x2 && sectionAbsX - (this._tileWidth) <= this._geometry.x2) && (sectionAbsY + sectionHeight + (this._tileHeight / 2) >= -this._geometry.y2 && sectionAbsY <= this._geometry.y2)) {
							// Grab the canvas to paint
							tileData = this._sections[x][y];

							ctx.drawImage(
								tileData,
								0, 0,
								sectionWidth,
								sectionHeight,
								sectionRenderX,
								sectionRenderY,
								sectionWidth,
								sectionHeight
							);

							ige._drawCount++;

							if (this._drawSections) {
								// Draw a bounding rectangle around the section
								ctx.strokeStyle = '#ff00f6';
								ctx.strokeRect(
									x * (this._tileWidth * this._autoSection),
									y * (this._tileHeight * this._autoSection),
									(this._tileWidth * this._autoSection),
									(this._tileHeight * this._autoSection)
								);
							}
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
	_renderTile: function (ctx, x, y, tileData, tileEntity, rect, sectionX, sectionY) {
		var finalX, finalY, regions,
			xm1, xp1, ym1, yp1, regObj,
			xAdjust = this._mountMode === 1 ? this._tileWidth / 2 : 0,
			yAdjust = this._mountMode === 1 ? this._tileHeight / 2 : 0;

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

		if (sectionX !== undefined) {
			finalX -= sectionX * this._autoSection * this._tileWidth;
		}
		if (sectionY !== undefined) {
			finalY -= sectionY * this._autoSection * this._tileHeight;
		}

		// If we have a rectangle region we are limiting to...
		if (rect) {
			// Check the bounds first
			if (!rect.xyInside(finalX, finalY)) {
				// The point is not inside the bounds, return
				return;
			}
		}

		if (finalX - (xAdjust) < 0) {
			regions = regions || [];
			regions.push({x: -1});
			xm1 = true;

			regObj = regObj || {};
			regObj.x = -1;
		}

		if (finalX + (xAdjust) > (ctx.canvas.width - (this._tileWidth))) {
			regions = regions || [];
			regions.push({x: 1});
			xp1 = true;

			regObj = regObj || {};
			regObj.x = 1;
		}

		if (finalY - (0) < 0) {
			regions = regions || [];
			regions.push({y: -1});
			ym1 = true;

			regObj = regObj || {};
			regObj.y = -1;
		}

		if (finalY + (0) > (ctx.canvas.height - (this._tileHeight))) {
			regions = regions || [];
			regions.push({y: 1});
			yp1 = true;

			regObj = regObj || {};
			regObj.y = 1;
		}

		if (xm1 || ym1 || xp1 || yp1) {
			regions.push(regObj);
		}

		ctx.save();
		ctx.translate(finalX, finalY);

		// Set the correct texture data
		texture = this._textureList[tileData[0]];
		tileEntity._cell = tileData[1];

		// Paint the texture
		texture.render(ctx, tileEntity, ige._tickDelta);
		ctx.restore();

		return regions;
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		// Set width / height of scene to match parent
		if (this._renderAreaAutoSize) {
			var geom = this._parent._geometry,
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
				_geometry: {
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
				_geometry: {
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