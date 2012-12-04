/**
 * Loads slightly modified Tiled-format json map data into the Isogenic Engine.
 */
var IgeTiledComponent = IgeClass.extend({
	classId: 'IgeTiledComponent',
	componentId: 'tiled',

	/**
	 * @constructor
	 * @param entity
	 * @param options
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._options = options;
	},

	/**
	 * Loads a .js Tiled json-format file and converts to IGE format,
	 * then calls the callback with the newly created scene and the
	 * various layers as IgeTextureMap instances.
	 * @param url
	 * @param callback
	 */
	loadJson: function (url, callback) {
		var self = this,
			scriptElem;

		if (typeof(url) === 'string') {
			if (!ige.isServer) {
				scriptElem = document.createElement('script');
				scriptElem.src = url;
				scriptElem.onload = function () {
					self.log('Tiled data loaded, processing...');
					self._processData(tiled, callback);
				};
				document.getElementsByTagName('head')[0].appendChild(scriptElem);
			} else {
				this.log('URL-based Tiled data is only available client-side. If you want to load Tiled map data on the server please include the map file in your ServerConfig.js file and then specify the map\'s data object instead of the URL.', 'error');
			}
		} else {
			self._processData(url, callback);
		}
	},

	_processData: function (data, callback) {
		var mapClass = ige.isServer === true ? IgeTileMap2d : IgeTextureMap,
			mapWidth = data.width,
			mapHeight = data.height,
			layerArray = data.layers,
			layerCount = layerArray.length,
			layer,
			layerType,
			layerData,
			layerDataCount,
			maps = [],
			layersById = {},
			tileSetArray = data.tilesets,
			tileSetCount = tileSetArray.length,
			tileSetItem,
			tileSetsTotal = tileSetCount,
			tileSetsLoaded = 0,
			textureCellLookup = [],
			currentTexture,
			currentCell,
			onLoadFunc,
			image,
			textures = [],
			allTexturesLoadedFunc,
			i, k, x, y, z,
			ent;

		// Define the function to call when all textures have finished loading
		allTexturesLoadedFunc = function () {
			// Create a map for each layer
			for (i = 0; i < layerCount; i++) {
				layer = layerArray[i];
				layerType = layer.type;

				// Check if the layer is a tile layer or an object layer
				if (layerType === 'tilelayer') {
					layerData = layer.data;

					maps[i] = new mapClass()
						.id(layer.name)
						.tileWidth(data.tilewidth)
						.tileHeight(data.tilewidth)
						.depth(i);

					maps[i].type = layerType;

					// Check if the layer should be isometric mounts enabled
					if (data.orientation === 'isometric') {
						maps[i].isometricMounts(true);
					}

					layersById[layer.name] = maps[i];
					tileSetCount = tileSetArray.length;

					if (!ige.isServer) {
						for (k = 0; k < tileSetCount; k++) {
							maps[i].addTexture(textures[k]);
						}
					}

					// Loop through the layer data and paint the tiles
					layerDataCount = layerData.length;

					for (y = 0; y < mapHeight; y++) {
						for (x = 0; x < mapWidth; x++) {
							z = x + (y * mapWidth);

							if (layerData[z] > 0 && layerData[z] !== 2147483712) {
								if (!ige.isServer) {
									// Paint the tile
									currentTexture = textureCellLookup[layerData[z]];
									if (currentTexture) {
										currentCell = layerData[z] - (currentTexture._tiledStartingId - 1);
										maps[i].paintTile(x, y, maps[i]._textureList.indexOf(currentTexture), currentCell);
									}
								} else {
									// Server-side we don't paint tiles on a texture map
									// we just mark the map data so that it can be used
									// to do things like path-finding and auto-creating
									// static physics objects.
									maps[i].occupyTile(x, y, 1, 1, layerData[z]);
								}
							}
						}
					}
				}

				if (layerType === 'objectgroup') {
					maps[i] = layer;
				}
			}

			callback(maps, layersById);
		};

		if (!ige.isServer) {
			onLoadFunc = function (textures, tileSetCount, tileSetItem) {
				return function () {
					var i, cc,
						cs = new IgeCellSheet(tileSetItem.image, this.width / tileSetItem.tilewidth, this.height / tileSetItem.tileheight)
							.id(tileSetItem.name)
							.on('loaded', function () {
								cc = this.cellCount();

								this._tiledStartingId = tileSetItem.firstgid;
								// Fill the lookup array
								for (i = 0; i < cc; i++) {
									textureCellLookup[this._tiledStartingId + i] = this;
								}

								textures.push(this);

								tileSetsLoaded++;

								if (tileSetsLoaded === tileSetsTotal) {
									// All textures loaded, fire processing function
									allTexturesLoadedFunc();
								}
							});
				};
			};

			// Load the tile sets as textures
			while (tileSetCount--) {
				// Load the image into memory first so we can read the total width and height
				image = new Image();

				tileSetItem = tileSetArray[tileSetCount];
				image.onload = onLoadFunc(textures, tileSetCount, tileSetItem);
				image.src = tileSetItem.image;
			}
		} else {
			// We're on the server so no textures are actually loaded
			allTexturesLoadedFunc();
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTiledComponent; }