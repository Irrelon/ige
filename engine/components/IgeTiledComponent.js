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

		scriptElem = document.createElement('script');
		scriptElem.src = url;
		scriptElem.onload = function () {
			self.log('Tiled data loaded, processing...');
			self._processData(tiled, callback);
		};
		document.getElementsByTagName('head')[0].appendChild(scriptElem);
	},

	_processData: function (data, callback) {
		var mapWidth = data.width,
			mapHeight = data.height,
			layerArray = data.layers,
			layerCount = layerArray.length,
			layer,
			layerData,
			layerDataCount,
			textureMaps = [],
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
			i, k, x, y, z;

		// Define the function to call when all textures have finished loading
		allTexturesLoadedFunc = function () {
			// Create a texture map for each layer
			for (i = 0; i < layerCount; i++) {
				layer = layerArray[i];
				layerData = layer.data;

				textureMaps[i] = new IgeTextureMap()
					.id(layer.name)
					.tileWidth(data.tilewidth)
					.tileHeight(data.tilewidth)
					.depth(i);

				// Check if the layer should be isometric mounts enabled
				if (data.orientation === 'isometric') {
					textureMaps[i].isometricMounts(true);
				}

				layersById[layer.name] = textureMaps[i];

				tileSetCount = tileSetArray.length;

				for (k = 0; k < tileSetCount; k++) {
					textureMaps[i].addTexture(textures[k]);
				}

				// Loop through the layer data and paint the tiles
				layerDataCount = layerData.length;

				for (y = 0; y < mapHeight; y++) {
					for (x = 0; x < mapWidth; x++) {
						z = x + (y * mapWidth);

						if (layerData[z] > 0 && layerData[z] !== 2147483712) {
							// Paint the tile
							currentTexture = textureCellLookup[layerData[z]];
							if (currentTexture) {
								currentCell = layerData[z] - (currentTexture._tiledStartingId - 1);
								textureMaps[i].paintTile(x, y, textureMaps[i]._textureList.indexOf(currentTexture), currentCell);
							}
						}
					}
				}
			}

			callback(textureMaps, layersById);
		};

		onLoadFunc = function (textures, tileSetCount, tileSetItem) {
			return function () {
				var i, cc,
					cs = new IgeCellSheet(tileSetItem.image, this.width / tileSetItem.tilewidth, this.height / tileSetItem.tileheight)
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
	}
});