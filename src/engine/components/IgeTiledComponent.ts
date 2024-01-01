import {IgeComponent} from "../core/IgeComponent";
import {IgeEntity} from "../core/IgeEntity";
import {isClient, isServer} from "../clientServer";
import {IgeTileMap2d} from "@/engine/core/IgeTileMap2d";
import {IgeTextureMap} from "@/engine/core/IgeTextureMap";
import {IgeCellSheet} from "@/engine/core/IgeCellSheet";

/**
 * Loads slightly modified Tiled-format json map data into the Isogenic Engine.
 */
export class IgeTiledComponent extends IgeComponent {
	classId = "IgeTiledComponent";
	componentId = "tiled";

	constructor (entity: IgeEntity, options?: any) {
		super(entity, options);
	}

	/**
	 * Loads a .js Tiled json-format file and converts to IGE format,
	 * then calls the callback with the newly created scene and the
	 * various layers as IgeTextureMap instances.
	 * @param url
	 * @param callback
	 */
	loadJson = (url, callback) => {
		let scriptElem;

		if (typeof (url) === "string") {
			if (isClient) {
				scriptElem = document.createElement("script");
				scriptElem.src = url;
				scriptElem.onload = function () {
					this.log("Tiled data loaded, processing...");
					//self._processData(tiled, callback);
				};

				document.getElementsByTagName("head")[0].appendChild(scriptElem);
			} else {
				this.log("URL-based Tiled data is only available client-side. If you want to load Tiled map data on the server please include the map file in your ServerConfig.js file and then specify the map's data object instead of the URL.", "error");
			}
		} else {
			this._processData(url, callback);
		}
	};

	_processData = (data, callback) => {
		const mapClass = isServer === true ? IgeTileMap2d : IgeTextureMap,
			mapWidth = data.width,
			mapHeight = data.height,
			layerArray = data.layers,
			layerCount = layerArray.length,
			maps: (IgeTileMap2d | IgeTextureMap)[] = [],
			layersById = {},
			tileSetArray = data.tilesets,
			tileSetsTotal = tileSetArray.length,
			textureCellLookup: IgeCellSheet[] = [],
			textures = [];

		let
			tileSetCount = tileSetArray.length,
			layer,
			layerType,
			layerData,
			layerDataCount,
			tileSetItem,
			tileSetsLoaded = 0,
			currentTexture,
			currentCell,
			onLoadFunc,
			image,
			i, k, x, y, z,
			ent;

		// Define the function to call when all textures have finished loading
		const allTexturesLoadedFunc = function () {
			// Create a map for each layer
			for (i = 0; i < layerCount; i++) {
				layer = layerArray[i];
				layerType = layer.type;

				// Check if the layer is a tile layer or an object layer
				if (layerType === "tilelayer") {
					layerData = layer.data;

					maps[i] = new mapClass()
						.id(layer.name)
						.tileWidth(data.tilewidth)
						.tileHeight(data.tilewidth)
						.depth(i);


					// Check if the layer should be isometric mounts enabled
					if (data.orientation === "isometric") {
						maps[i].isometricMounts(true);
					}

					layersById[layer.name] = maps[i];
					tileSetCount = tileSetArray.length;

					if (isClient) {
						const textureMap = maps[i] as IgeTextureMap
						textureMap.type = layerType;

						for (k = 0; k < tileSetCount; k++) {
							textureMap.addTexture(textures[k]);
						}
					}

					// Loop through the layer data and paint the tiles
					layerDataCount = layerData.length;

					for (y = 0; y < mapHeight; y++) {
						for (x = 0; x < mapWidth; x++) {
							z = x + (y * mapWidth);

							if (layerData[z] > 0 && layerData[z] !== 2147483712) {
								if (isClient) {
									const textureMap = maps[i] as IgeTextureMap

									// Paint the tile
									currentTexture = textureCellLookup[layerData[z]];
									if (currentTexture) {
										currentCell = layerData[z] - (currentTexture._tiledStartingId - 1);
										textureMap.paintTile(x, y, textureMap._textureList.indexOf(currentTexture), currentCell);
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

				if (layerType === "objectgroup") {
					maps[i] = layer;
					layersById[layer.name] = maps[i];
				}
			}

			callback(maps, layersById);
		};

		if (isClient) {
			onLoadFunc = function (_textures, _tileSetCount, _tileSetItem) {
				return function (this: HTMLImageElement) {
					let cc;
					const cs = new IgeCellSheet(_tileSetItem.name, _tileSetItem.image, this.width / _tileSetItem.tilewidth, this.height / _tileSetItem.tileheight)
						.on("loaded", function (this: IgeCellSheet) {
							cc = this.cellCount();

							const tiledStartingId = _tileSetItem.firstgid;
							// Fill the lookup array
							for (let ii = 0; ii < cc; i++) {
								textureCellLookup[tiledStartingId + ii] = this;
							}

							_textures.push(this);

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
}
