import IgeBaseClass from "./IgeBaseClass";
/**
 * Creates a new map that has two dimensions (x and y) to its data.
 */
declare class IgeMap2d extends IgeBaseClass {
    classId: string;
    _mapData: any[][];
    constructor(data?: any[][]);
    /**
     * Gets / sets a value on the specified map tile co-ordinates.
     * @param {Number} x
     * @param {Number} y
     * @param {*=} val The data to set on the map tile co-ordinate.
     * @return {*}
     */
    tileData(x?: number, y?: number, val?: any): any;
    /**
     * Clears any data set at the specified map tile co-ordinates.
     * @param x
     * @param y
     * @return {Boolean} True if data was cleared or false if no data existed.
     */
    clearData(x?: number, y?: number): boolean;
    /**
     * Checks if the tile area passed has any data stored in it. If
     * so, returns true, otherwise false.
     * @param x
     * @param y
     * @param width
     * @param height
     */
    collision(x?: number, y?: number, width?: number, height?: number): boolean;
    /**
     * Checks if the tile area passed has data stored in it that matches
     * the passed data. If so, returns true, otherwise false.
     * @param x
     * @param y
     * @param width
     * @param height
     * @param data
     */
    collisionWith(x?: number, y?: number, width?: number, height?: number, data?: any): boolean;
    /**
     * Checks if the tile area passed has data stored in it that matches
     * the passed data and does not collide with any other stored tile
     * data. If so, returns true, otherwise false.
     * @param x
     * @param y
     * @param width
     * @param height
     * @param data
     */
    collisionWithOnly(x?: number, y?: number, width?: number, height?: number, data?: any): boolean;
    /**
     * Gets / sets the map's tile data.
     * @param val The map data array.
     * @param startX The start x co-ordinate of the data.
     * @param startY The start y co-ordinate of the data.
     * @return {*}
     */
    mapData(val: number[][], startX: number, startY: number): this;
    mapData(val: number[][]): this;
    mapData(): number[][];
    sortedMapDataAsArray(): number[][];
    _sortKeys(obj: Record<string, any>): string[];
    /**
     * Returns a string of the map's data in JSON format.
     * @return {String}
     */
    mapDataString(): string;
    translateDataBy(transX: number, transY: number): void;
}
export default IgeMap2d;
