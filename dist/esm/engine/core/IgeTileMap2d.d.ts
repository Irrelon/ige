import { IgeEntity } from "./IgeEntity.js"
import { IgeMap2d } from "./IgeMap2d.js"
import type { IgeObject } from "./IgeObject.js"
import { IgePoint2d } from "./IgePoint2d.js"
import { IgePoint3d } from "./IgePoint3d.js"
import { IgePoly2d } from "./IgePoly2d.js"
import { IgeBounds } from "./IgeBounds.js"
export type IgeTileMap2dScanRectCallback = (mapData: any, x: number, y: number) => boolean;
export interface IgeTileMap2dSavedMap {
    data: any[][];
    dataXY: [number, number];
}
/**
 * Tile maps provide a way to align mounted child objects to a tile-based grid.
 * NOTE: These are not to be confused with IgeTextureMap's which allow you to
 * paint a bunch of tiles to a grid.
 */
export declare class IgeTileMap2d<MapDataType = any> extends IgeEntity {
    classId: string;
    IgeTileMap2d: boolean;
    _drawGrid?: boolean;
    _highlightOccupied: boolean;
    _highlightTileRect: IgeBounds | null;
    _gridColor?: string;
    _gridSize: IgePoint2d;
    _hoverColor?: string;
    map: IgeMap2d<MapDataType>;
    heightMap: IgeMap2d;
    constructor(tileWidth?: number, tileHeight?: number, tileDepth?: number);
    /**
     * Gets / sets the flag that determines if the tile map will paint the
     * occupied tiles with an overlay colour so that it is easy to spot them.
     * @param val
     * @return {*}
     */
    highlightOccupied(val: boolean): this;
    highlightOccupied(): boolean;
    highlightTileRect(val: IgeBounds | null): this;
    highlightTileRect(): IgeBounds;
    /**
     * Gets / sets the map's tile width.
     * @param {number} val Tile width.
     * @return {*}
     */
    tileWidth(val: number): this;
    tileWidth(): number;
    /**
     * Gets / sets the map's tile height.
     * @param {number} val Tile height.
     * @return {*}
     */
    tileHeight(val: number): this;
    tileHeight(): number;
    /**
     * Gets / sets the map's tile depth (z axis).
     * @param {number} [val] Tile depth.
     * @return {*}
     */
    tileDepth(val: number): this;
    tileDepth(): number;
    gridSize(x: number, y: number): this;
    gridSize(): IgePoint2d;
    /**
     * Gets / sets if the tile map should paint a grid to the context during
     * the tick method.
     * @param {Boolean=} val If true, will paint the grid on tick.
     * @return {*}
     */
    drawGrid(val: boolean): this;
    drawGrid(): boolean;
    /**
     * Gets / sets the color of the grid overlay lines. It accepts a string color
     * definition with the same specifications as the canvas context strokeStyle
     * property.
     *
     * @param {string=} val The color to set the grid lines.
     * @returns {string | this | undefined} The current color of the grid if called without an argument,
     *    `this` if called with an argument to support method chaining, or undefined if no argument is provided,
     *    indicating that the color has not been set.
     */
    gridColor(val?: string): string | this | undefined;
    /**
     * Sets a tile or area as occupied by the passed obj parameter.
     * Any previous occupy data on the specified tile or area will be
     * overwritten.
     *
     * @param {number=} x X co-ordinate of the tile to un-occupy.
     * @param {number=} y Y co-ordinate of the tile to un-occupy.
     * @param {number=} width Number of tiles along the x-axis to occupy.
     * @param {number=} height Number of tiles along the y-axis to occupy.
     * @param {any=} obj The object to occupy the tile or area.
     *
     * @return {this} The object itself for method chaining.
     */
    occupyTile(x?: number, y?: number, width?: number, height?: number, obj?: any): this;
    /**
     * Removes all data from the specified tile or area. If either the x or y arguments
     * are undefined, the function returns without taking any action.
     * @param {number=} x The x-coordinate of the tile or area.
     * @param {number=} y The y-coordinate of the tile or area.
     * @param {number=} width The width of the area (default is 1).
     * @param {number=} height The height of the area (default is 1).
     * @return {this} Returns the current instance of the object.
     */
    unOccupyTile(x?: number, y?: number, width?: number, height?: number): this;
    /**
     * Returns true if the specified tile or tile area has
     * an occupied status.
     * @param {number} x
     * @param {number} y
     * @param {number=} width
     * @param {number=} height
     * @return {*}
     */
    isTileOccupied(x: number, y: number, width?: number, height?: number): boolean;
    /**
     * Returns the data of the occupied tile at the given coordinates.
     * This is a proxy for `this.map.tileData(x, y);`
     *
     * @param {number} x The x-coordinate of the tile.
     * @param {number} y The y-coordinate of the tile.
     * @returns The data of the occupied tile at the given coordinates.
     */
    tileOccupiedBy(x: number, y: number): MapDataType;
    /**
     * Returns the tile co-ordinates of the tile that the point's world
     * co-ordinates reside inside. Useful for things like getting the tile
     * the mouse is currently hovering over, or checking what tile an entity
     * is "standing" on etc.
     * @param {IgePoint3d} point The world co-ordinate to translate to
     * a tile co-ordinate.
     * @return {IgePoint3d} The tile co-ordinates as a point object.
     */
    pointToTile(point: IgePoint2d | IgePoint3d): IgePoint3d;
    /**
     * Returns the world co-ordinates of the tile the mouse is currently over.
     * @return {IgePoint3d}
     */
    mouseTilePoint(): IgePoint3d;
    tileToPoint(x: number, y: number): any;
    /**
     * Returns the tile co-ordinates of the tile the mouse is currently over.
     * @return {IgePoint3d}
     */
    mouseToTile(): IgePoint3d;
    tileToWorld(tileX: number, tileY: number): IgePoint3d;
    /**
     * Scans the map data and returns an array of rectangle
     * objects that encapsulate the map data into discrete
     * rectangle areas.
     * @param {Function=} callback Returns true or false for
     * the passed map data determining if it should be included
     * in a rectangle or not.
     * @return {Array}
     */
    scanRects(callback?: IgeTileMap2dScanRectCallback): Array<any>;
    _scanRects(mapData: any[][], x: number, y: number, callback?: IgeTileMap2dScanRectCallback): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    inGrid(x: number, y: number, width?: number, height?: number): boolean;
    /**
     * Gets / sets the mouse tile hover color used in conjunction with the
     * drawMouse() method.
     * @param {string=} val The hex or rbg string color definition e.g. #ff0099.
     * @returns {*}
     */
    hoverColor(val?: string): string | this | undefined;
    /**
     * Loads map data from a saved map.
     * @param {Object} map The map data object.
     */
    loadMap(map: IgeTileMap2dSavedMap): this;
    /**
     * Returns a map JSON string that can be saved to a data file and loaded
     * with the loadMap() method.
     * @return {Object} The map data object.
     */
    saveMap(): string;
    isometricMounts(): boolean;
    isometricMounts(val: boolean): this;
    tileMapHitPolygon(): IgePoly2d | IgeBounds | undefined;
    _processTriggerHitTests(): boolean;
    _updateAdjustmentMatrix(): void;
    _childMounted(obj: IgeObject): void;
}
