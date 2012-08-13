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

	/**
	 * Reads the map data from a standard map object and fills the map
	 * with the data found.
	 * @param map
	 */
	loadMap: function (map) {
		// TODO: Load the textures this map requires via the url array in map.textures
		this.map.mapData(map.data);
	},

	/**
	 * Returns a map JSON string that can be saved to a data file and loaded
	 * with the loadMap() method.
	 */
	saveMap: function () {
		// TODO: Return the string data and also an array with each map texture in map.textures
		// in URL format
		return this.map.mapDataString();
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
			x, y, tx, ty, sx, sy,
			texture, tileData, tileEntity = this._newTileEntity(); // TODO: This is wasteful, cache it?

		for (x in mapData) {
			if (mapData.hasOwnProperty(x)) {
				for (y in mapData[x]) {
					if (mapData[x].hasOwnProperty(y)) {
						// Grab the tile data to paint
						tileData = mapData[x][y];

						if (tileData) {
							ctx.save();
								// Translate the canvas to the tile position
								if (this._mountMode === 0) {
									ctx.translate(x * this._tileWidth, y * this._tileHeight);
								}

								if (this._mountMode === 1) {
									// Convert the tile x, y to isometric
									tx = x * this._tileWidth;
									ty = y * this._tileHeight;
									sx = tx - ty;
									sy = (tx + ty) * 0.5;

									ctx.translate(sx, sy);
								}

								// Set the correct texture data
								texture = this._textureList[tileData[0]];
								tileEntity._cell = tileData[1];

								// Paint the texture
								texture.render(ctx, tileEntity, ige.tickDelta);
							ctx.restore();
						}
					}
				}
			}
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