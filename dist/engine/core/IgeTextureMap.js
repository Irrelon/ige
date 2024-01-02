// TODO: Implement the _stringify() method for this class
import { IgeMap2d } from "./IgeMap2d.js"
import { IgePoint3d } from "./IgePoint3d.js"
import { IgeTileMap2d } from "./IgeTileMap2d.js"
import { ige } from "../instance.js"
import { IgeMountMode } from "../../enums/IgeMountMode.js"
/**
 * Texture maps provide a way to display textures / cells across a tile map.
 */
export class IgeTextureMap extends IgeTileMap2d {
    classId = "IgeTextureMap";
    _textureList;
    _renderCenter;
    _autoSection;
    _drawSectionBounds = false;
    _allTexturesLoaded = false;
    _sections = [];
    _sectionCtx = [];
    _sectionTileRegion;
    type;
    constructor(tileWidth, tileHeight) {
        super(tileWidth, tileHeight);
        this.map = new IgeMap2d();
        this._textureList = [];
        this._renderCenter = new IgePoint3d(0, 0, 0);
        this._cacheDirty = true;
    }
    /**
     * Gets / sets the auto sectioning mode. If enabled the texture map
     * will render to off-screen canvases in sections denoted by the
     * number passed. For instance if you pass 10, the canvas sections
     * will be 10x10 tiles in size.
     * @param {number=} val The size in tiles of each section.
     * @return {*}
     */
    autoSection(val) {
        if (val !== undefined) {
            this._autoSection = val;
            return this;
        }
        return this._autoSection;
    }
    /**
     * Gets / sets the draw sections flag. If true the texture map will
     * output debug lines between each section of the map when using the
     * auto section system.
     * @param {number=} val The boolean flag value.
     * @return {*}
     */
    drawSectionBounds(val) {
        if (val !== undefined) {
            this._drawSectionBounds = val;
            return this;
        }
        return this._drawSectionBounds;
    }
    /**
     * Forces a cache redraw on the next tick.
     */
    cacheForceFrame() {
        this._cacheDirty = true;
    }
    /**
     * Takes another map and removes any data from this map where data already
     * exists in the other.
     * @param {IgeTileMap2d} entity The other map to read map data from.
     * @return {*}
     */
    negate(entity) {
        if (entity !== undefined) {
            const entityMapData = entity.map._mapData;
            const thisMapData = this.map._mapData;
            for (const y in entityMapData) {
                if (entityMapData.hasOwnProperty(y)) {
                    for (const x in entityMapData[y]) {
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
    }
    /**
     * Adds a texture to the texture map's internal texture list so
     * that it can be referenced via an index so that the texture map's
     * data will be something like [[textureId, textureCell]]
     * or a real world example: [[0, 1], [1, 1]].
     * @param {IgeTexture} texture
     * @return {Integer} The index of the texture you just added.
     */
    addTexture(texture) {
        this._textureList.push(texture);
        if (!texture._loaded) {
            this._allTexturesLoaded = false;
        }
        return this._textureList.length - 1;
    }
    /**
     * Checks the status of all the textures that have been added to
     * this texture map and returns true if they are all loaded.
     * @return {Boolean} True if all textures are loaded, false if
     * not.
     */
    allTexturesLoaded() {
        if (!this._allTexturesLoaded) {
            const arr = this._textureList;
            let arrCount = arr.length;
            while (arrCount--) {
                if (!arr[arrCount]._loaded) {
                    return false;
                }
            }
        }
        this._allTexturesLoaded = true;
        return true;
    }
    /**
     * Sets the specified tile's texture index and cell that will be used
     * when rendering the texture map.
     * @param {number} x The tile x co-ordinate.
     * @param {number} y The tile y co-ordinate.
     * @param {number} textureIndex The texture index.
     * @param {number} cell The cell index.
     */
    paintTile(x, y, textureIndex, cell) {
        if (x !== undefined && y !== undefined && textureIndex !== undefined) {
            if (cell === undefined || cell < 1) {
                cell = 1; // Set the cell default to 1
            }
            this.map.tileData(x, y, [textureIndex, cell]);
        }
    }
    /**
     * Clears any previous tile texture and cell data for the specified
     * tile co-ordinates.
     * @param {number} x The tile x co-ordinate.
     * @param {number} y The tile y co-ordinate.
     */
    clearTile(x, y) {
        this.map.clearData(x, y);
    }
    /**
     * Reads the map data from a standard map object and fills the map
     * with the data found.
     * @param {Object} map The map data object.
     */
    loadMap(map) {
        if (map.textures) {
            // Empty the existing array
            this._textureList = [];
            const tex = [];
            // Loop the texture list and create each texture object
            for (let i = 0; i < map.textures.length; i++) {
                // Load each texture
                tex[i] = map.textures[i];
                this.addTexture(tex[i]);
            }
            // Fill in the map data
            this.map.mapData(map.data);
        }
        else {
            // Just fill in the map data
            this.map.mapData(map.data);
        }
        return this;
    }
    /**
     * Returns a map JSON string that can be saved to a data file and loaded
     * with the loadMap() method.
     * @return {Object} The map data object.
     */
    saveMap() {
        // in URL format
        const textures = [], mapData = this.map._mapData;
        let i, x, y, dataX = 0, dataY = 0;
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
            textures,
            data: this.map.mapData(),
            dataXY: [dataX, dataY]
        });
    }
    /**
     * Clears the tile data from the map effectively wiping it clean. All
     * existing map data will be removed. The textures assigned to the texture
     * map will not be affected.
     * @returns {*}
     */
    clearMap() {
        this.map.mapData([]);
        return this;
    }
    /**
     * Clears tile data from the map and also removes any textures from the
     * map that were previously assigned to it. This is useful for reverting
     * the texture map to it's virgin state as if it had just been created.
     * @returns {*}
     */
    reset() {
        this.clearMap();
        this._textureList = [];
        return this;
    }
    /**
     * Gets / sets the specified tile's texture index.
     * @param {number} x The tile x co-ordinate.
     * @param {number} y The tile y co-ordinate.
     * @param {number=} textureIndex The new texture index.
     */
    tileTextureIndex(x, y, textureIndex) {
        if (x !== undefined && y !== undefined) {
            const obj = this.map.tileData(x, y);
            if (textureIndex !== undefined) {
                // Set the cell
                obj[0] = textureIndex;
            }
            else {
                return obj[0];
            }
        }
    }
    /**
     * Gets / sets the specified tile's texture cell.
     * @param {number} x The tile x co-ordinate.
     * @param {number} y The tile y co-ordinate.
     * @param {number} cell The new cell index.
     */
    tileTextureCell(x, y, cell) {
        if (x !== undefined && y !== undefined) {
            const obj = this.map.tileData(x, y);
            if (cell !== undefined) {
                // Set the cell
                obj[1] = cell;
            }
            else {
                return obj[1];
            }
        }
    }
    /**
     * Converts data that is saved in the format [x][y] to the IGE standard
     * of [y][x] and then returns the data.
     * @param {Array} mapData The map data array.
     * @return {Object} The new map data.
     */
    convertHorizontalData(mapData) {
        const newData = [];
        let x, y;
        for (x in mapData) {
            if (mapData.hasOwnProperty(x)) {
                for (y in mapData[x]) {
                    if (mapData[x].hasOwnProperty(y)) {
                        // Displace the data from the x axis to the y axis
                        newData[y] = newData[y] || [];
                        newData[y][x] = mapData[x][y];
                    }
                }
            }
        }
        return newData;
    }
    /**
     * Handles rendering the texture map during engine tick events.
     * @param {CanvasRenderingContext2D} ctx
     */
    tick(ctx) {
        // TODO: This is being called at the wrong time, drawing children before this parent! FIX THIS
        // Run the IgeTileMap2d tick method
        super.tick(ctx);
        // Draw each image that has been defined on the map
        const mapData = this.map._mapData, tileEntity = this._newTileEntity(); // TODO: This is wasteful, cache it?
        let x, y, tx, ty, xInt, yInt, finalX, finalY, finalPoint, tileData, sectionX, sectionY, tempSectionX, tempSectionY, _ctx, regions, region, i;
        if (this._autoSection !== undefined && this._autoSection > 0) {
            if (this._cacheDirty) {
                // Check that all the textures we need to use are loaded
                if (this.allTexturesLoaded()) {
                    // We have a dirty cache so render the section cache
                    // data first
                    // TODO: Shouldn't we be replacing these arrays with new ones to drop the old ones from memory?
                    // TODO: Gonna do that now and see what the result is.
                    this._sections = []; //this._sections || [];
                    this._sectionCtx = []; //this._sectionCtx || [];
                    // TODO: This isn't ideal because we are almost certainly dropping sections that are still relevant,
                    // TODO: so we should scan and garbage collect I think, instead.
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
                                    if (this._mountMode === IgeMountMode.flat) {
                                        // We're rendering a 2d map
                                        finalX = xInt;
                                        finalY = yInt;
                                    }
                                    if (this._mountMode === IgeMountMode.iso) {
                                        // We're rendering an iso map
                                        // Convert the tile x, y to isometric
                                        tx = xInt * this._tileWidth;
                                        ty = yInt * this._tileHeight;
                                        finalX = (tx - ty) / this._tileWidth;
                                        finalY = ((tx + ty) * 0.5) / this._tileHeight;
                                    }
                                    // Grab the tile data to paint
                                    tileData = mapData[y][x];
                                    // Work out which section to paint to
                                    sectionX = Math.floor(finalX / this._autoSection);
                                    sectionY = Math.floor(finalY / this._autoSection);
                                    // Check if an off-screen canvas already exists for this section
                                    // and if not, create one
                                    this._ensureSectionExists(sectionX, sectionY, this._autoSection);
                                    // Grab the drawing context for the section
                                    _ctx = this._sectionCtx[sectionX][sectionY];
                                    if (tileData) {
                                        regions = this._renderTile(_ctx, xInt, yInt, tileData, tileEntity, undefined, sectionX, sectionY);
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
                                                this._ensureSectionExists(tempSectionX, tempSectionY, this._autoSection);
                                                _ctx = this._sectionCtx[tempSectionX][tempSectionY];
                                                this._sectionTileRegion = this._sectionTileRegion || [];
                                                this._sectionTileRegion[tempSectionX] =
                                                    this._sectionTileRegion[tempSectionX] || [];
                                                this._sectionTileRegion[tempSectionX][tempSectionY] =
                                                    this._sectionTileRegion[tempSectionX][tempSectionY] || [];
                                                this._sectionTileRegion[tempSectionX][tempSectionY][xInt] =
                                                    this._sectionTileRegion[tempSectionX][tempSectionY][xInt] || [];
                                                if (!this._sectionTileRegion[tempSectionX][tempSectionY][xInt][yInt]) {
                                                    this._sectionTileRegion[tempSectionX][tempSectionY][xInt][yInt] =
                                                        true;
                                                    this._renderTile(_ctx, xInt, yInt, tileData, tileEntity, undefined, tempSectionX, tempSectionY);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Set the cache to clean!
                    this._cacheDirty = false;
                    // Remove the temporary section tile painted data
                    delete this._sectionTileRegion;
                }
            }
            this._drawSectionsToCtx(ctx, this._autoSection);
        }
        else {
            // Check that all the textures we need to use are loaded
            if (this.allTexturesLoaded()) {
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
        }
    }
    /**
     * Private method, checks if the specified section currently exists in the cache
     * and if not, creates it.
     * @param {number} sectionX The section's x co-ordinate.
     * @param {number} sectionY The section's y co-ordinate.
     * @private
     */
    _ensureSectionExists(sectionX, sectionY, autoSection) {
        let sectionCtx;
        this._sections[sectionX] = this._sections[sectionX] || [];
        this._sectionCtx[sectionX] = this._sectionCtx[sectionX] || [];
        if (!this._sections[sectionX][sectionY]) {
            this._sections[sectionX][sectionY] = new OffscreenCanvas(2, 2);
            this._sections[sectionX][sectionY].width = this._tileWidth * autoSection;
            this._sections[sectionX][sectionY].height = this._tileHeight * autoSection;
            sectionCtx = this._sectionCtx[sectionX][sectionY] = this._sections[sectionX][sectionY].getContext("2d");
            // Ensure the canvas is using the correct image antialiasing mode
            if (!ige.engine._globalSmoothing) {
                sectionCtx.imageSmoothingEnabled = false;
            }
            else {
                sectionCtx.imageSmoothingEnabled = true;
            }
            // One-time translate the context
            sectionCtx.translate(this._tileWidth / 2, this._tileHeight / 2);
        }
    }
    /**
     * Private method, draws cached image sections to the canvas context.
     * @param {CanvasRenderingContext2D} ctx
     * @private
     */
    _drawSectionsToCtx(ctx, autoSection) {
        if (ige.engine._currentCamera === null || ige.engine._currentViewport === null) {
            throw new Error("Engine was not ready");
        }
        const viewArea = ige.engine._currentViewport.viewArea(), sectionWidth = this._tileWidth * autoSection, sectionHeight = this._tileHeight * autoSection;
        let x, y, tileData, sectionRenderX, sectionRenderY, sectionAbsX, sectionAbsY;
        // Render the map sections
        //ctx.translate(-(this._tileWidth / 2), -(this._tileHeight / 2));
        for (x in this._sections) {
            if (this._sections.hasOwnProperty(x)) {
                for (y in this._sections[x]) {
                    if (this._sections[x].hasOwnProperty(y)) {
                        sectionRenderX = x * (this._tileWidth * autoSection);
                        sectionRenderY = y * (this._tileHeight * autoSection);
                        sectionAbsX = this._translate.x + sectionRenderX - ige.engine._currentCamera._translate.x;
                        sectionAbsY = this._translate.y + sectionRenderY - ige.engine._currentCamera._translate.y;
                        // Check if we are drawing isometrically and adjust
                        if (this._mountMode === IgeMountMode.iso) {
                            sectionAbsX -= this._tileWidth / 2;
                            sectionAbsY -= this._tileHeight / 2;
                        }
                        // Check if the section is "on screen"
                        if (sectionAbsX + sectionWidth + this._tileHeight / 2 >= -(viewArea.width / 2) &&
                            sectionAbsX - this._tileWidth / 2 <= viewArea.width / 2 &&
                            sectionAbsY + sectionHeight + this._tileHeight / 2 >= -(viewArea.height / 2) &&
                            sectionAbsY <= viewArea.height / 2) {
                            // Grab the canvas to paint
                            tileData = this._sections[x][y];
                            ctx.drawImage(tileData, 0, 0, sectionWidth, sectionHeight, sectionRenderX, sectionRenderY, sectionWidth, sectionHeight);
                            ige.metrics.drawCount++;
                            if (this._drawSectionBounds) {
                                // Draw a bounding rectangle around the section
                                ctx.strokeStyle = "#ff00f6";
                                ctx.strokeRect(x * (this._tileWidth * autoSection), y * (this._tileHeight * autoSection), this._tileWidth * autoSection, this._tileHeight * autoSection);
                            }
                        }
                    }
                }
            }
        }
    }
    /**
     * Private method, renders a tile texture based on data from the texture map,
     * to a cached section.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x The tile x co-ordinate.
     * @param {number} y The tile y co-ordinate.
     * @param {Object} tileData The tile's texture and cell data.
     * @param {Object} tileEntity The object that represents the tile.
     * @param {IgeRect=} rect The rectangular area to limit drawing to.
     * @param {number} sectionX The x co-ordinate of the section to draw to.
     * @param {number} sectionY The y co-ordinate of the section to draw to.
     * @return {*}
     * @private
     */
    _renderTile(ctx, x, y, tileData, tileEntity, rect, sectionX, sectionY) {
        // TODO: Handle scaling so tiles don't loose res on scaled cached sections
        const xAdjust = this._mountMode === IgeMountMode.iso ? this._tileWidth / 2 : 0, yAdjust = this._mountMode === IgeMountMode.iso ? this._tileHeight / 2 : 0;
        let finalX, finalY, regions, xm1, xp1, ym1, yp1, regObj, tx, ty, sx, sy;
        // Translate the canvas to the tile position
        if (this._mountMode === IgeMountMode.flat) {
            finalX = x * this._tileWidth;
            finalY = y * this._tileHeight;
        }
        if (this._mountMode === IgeMountMode.iso) {
            // Convert the tile x, y to isometric
            tx = x * this._tileWidth;
            ty = y * this._tileHeight;
            sx = tx - ty;
            sy = (tx + ty) * 0.5;
            finalX = sx - this._tileWidth / 2;
            finalY = sy;
        }
        if (sectionX !== undefined && this._autoSection !== undefined) {
            finalX -= sectionX * this._autoSection * this._tileWidth;
        }
        if (sectionY !== undefined && this._autoSection !== undefined) {
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
        if (finalX - xAdjust < 0) {
            regions = regions || [];
            regions.push({ x: -1 });
            xm1 = true;
            regObj = regObj || {};
            regObj.x = -1;
        }
        if (finalX + xAdjust > ctx.canvas.width - this._tileWidth) {
            regions = regions || [];
            regions.push({ x: 1 });
            xp1 = true;
            regObj = regObj || {};
            regObj.x = 1;
        }
        if (finalY - 0 < 0) {
            regions = regions || [];
            regions.push({ y: -1 });
            ym1 = true;
            regObj = regObj || {};
            regObj.y = -1;
        }
        if (finalY + 0 > ctx.canvas.height - this._tileHeight) {
            regions = regions || [];
            regions.push({ y: 1 });
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
        const texture = this._textureList[tileData[0]];
        tileEntity._cell = tileData[1];
        // Paint the texture
        if (texture) {
            texture.render(ctx, tileEntity, ige.engine._tickDelta);
        }
        ctx.restore();
        return regions;
    }
    /**
     * Private method, creates an entity object that a texture can use to render
     * itself. This is basically a dummy object that has the minimum amount of data
     * in it that a texture requires to render such as geometry, texture
     * cell and rendering position.
     * @return {Object} The new tile entity object.
     * @private
     */
    _newTileEntity() {
        if (this._mountMode === IgeMountMode.flat) {
            return {
                _cell: 1,
                _bounds2d: {
                    x: this._tileWidth,
                    y: this._tileHeight
                },
                _renderPos: {
                    x: -this._tileWidth / 2,
                    y: -this._tileHeight / 2
                }
            };
        }
        if (this._mountMode === IgeMountMode.iso) {
            return {
                _cell: 1,
                _bounds2d: {
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
}
