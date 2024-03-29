"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeTiledComponent = void 0;
const IgeCellSheet_1 = require("../core/IgeCellSheet.js");
const IgeComponent_1 = require("../core/IgeComponent.js");
const IgeTextureMap_1 = require("../core/IgeTextureMap.js");
const IgeTileMap2d_1 = require("../core/IgeTileMap2d.js");
const clientServer_1 = require("../utils/clientServer.js");
/**
 * Loads slightly modified Tiled-format json map data into the Isogenic Engine.
 */
class IgeTiledComponent extends IgeComponent_1.IgeComponent {
    constructor(entity, options) {
        super(entity, options);
        this.classId = "IgeTiledComponent";
        this.componentId = "tiled";
        /**
         * Loads a .js Tiled json-format file and converts to IGE format,
         * then calls the callback with the newly created scene and the
         * various layers as IgeTextureMap instances.
         * @param url
         * @param callback
         */
        this.loadJson = (url, callback) => {
            let scriptElem;
            if (typeof url === "string") {
                if (clientServer_1.isClient) {
                    scriptElem = document.createElement("script");
                    scriptElem.src = url;
                    scriptElem.onload = function () {
                        this.log("Tiled data loaded, processing...");
                        //self._processData(tiled, callback);
                    };
                    document.getElementsByTagName("head")[0].appendChild(scriptElem);
                }
                else {
                    this.log("URL-based Tiled data is only available client-side. If you want to load Tiled map data on the server please include the map file in your ServerConfig.js file and then specify the map's data object instead of the URL.", "error");
                }
            }
            else {
                this._processData(url, callback);
            }
        };
        this._processData = (data, callback) => {
            const mapClass = clientServer_1.isServer === true ? IgeTileMap2d_1.IgeTileMap2d : IgeTextureMap_1.IgeTextureMap, mapWidth = data.width, mapHeight = data.height, layerArray = data.layers, layerCount = layerArray.length, maps = [], layersById = {}, tileSetArray = data.tilesets, tileSetsTotal = tileSetArray.length, textureCellLookup = [], textures = [];
            let tileSetCount = tileSetArray.length, layer, layerType, layerData, layerDataCount, tileSetItem, tileSetsLoaded = 0, currentTexture, currentCell, onLoadFunc, image, i, k, x, y, z, ent;
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
                        if (clientServer_1.isClient) {
                            const textureMap = maps[i];
                            textureMap.type = layerType;
                            for (k = 0; k < tileSetCount; k++) {
                                textureMap.addTexture(textures[k]);
                            }
                        }
                        // Loop through the layer data and paint the tiles
                        layerDataCount = layerData.length;
                        for (y = 0; y < mapHeight; y++) {
                            for (x = 0; x < mapWidth; x++) {
                                z = x + y * mapWidth;
                                if (layerData[z] > 0 && layerData[z] !== 2147483712) {
                                    if (clientServer_1.isClient) {
                                        const textureMap = maps[i];
                                        // Paint the tile
                                        currentTexture = textureCellLookup[layerData[z]];
                                        if (currentTexture) {
                                            currentCell = layerData[z] - (currentTexture._tiledStartingId - 1);
                                            textureMap.paintTile(x, y, textureMap._textureList.indexOf(currentTexture), currentCell);
                                        }
                                    }
                                    else {
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
            if (clientServer_1.isClient) {
                onLoadFunc = function (_textures, _tileSetCount, _tileSetItem) {
                    return function () {
                        let cc;
                        const cs = new IgeCellSheet_1.IgeCellSheet(_tileSetItem.name, _tileSetItem.image, this.width / _tileSetItem.tilewidth, this.height / _tileSetItem.tileheight).on("loaded", function () {
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
            }
            else {
                // We're on the server so no textures are actually loaded
                allTexturesLoadedFunc();
            }
        };
    }
}
exports.IgeTiledComponent = IgeTiledComponent;
