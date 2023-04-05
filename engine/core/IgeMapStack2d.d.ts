import { IgeBaseClass } from "./IgeBaseClass";
/**
 * Creates a new map that has two dimensions (x and y) to its data
 * and allows multiple items to be stored or "stacked" on a single
 * x, y map position.
 */
export declare class IgeMapStack2d extends IgeBaseClass {
    classId: string;
    constructor(data: any);
    /**
     * Gets / sets the data stored at the specified map tile co-ordinates. If data already
     * exists at the specified co-ordinates, it is replaced with the passed data.
     * @param {number} x
     * @param {number} y
     * @param {Array=} val The array of data items to set at the specified co-ordinates.
     * @return {*} This or an array of data items at the specified co-ordinates.
     */
    tileData(x: any, y: any, val: any): any;
    /**
     * Gets the data stored at the specified co-ordinates and index.
     * @param {number} x
     * @param {number} y
     * @param {number} index
     * @return {*} The current data stored at the specified point or undefined if no data exists.
     */
    tileDataAtIndex(x: any, y: any, index: any): any;
    /**
     * Adds a data item to the specified map tile co-ordinates.
     * @param {number} x
     * @param {number} y
     * @param {*} val The data to add.
     * @return {*} This on success or false on failure.
     */
    push(x: any, y: any, val: any): false | this;
    /**
     * Removes a data item from the specified map tile co-ordinates.
     * @param {number} x
     * @param {number} y
     * @param {*} val The data to remove.
     * @return {*} This on success or false on failure.
     */
    pull(x: any, y: any, val: any): false | this;
    /**
     * Checks if the tile area passed has any data stored in it. If
     * so, returns true, otherwise false.
     * @param x
     * @param y
     * @param width
     * @param height
     */
    collision(x: any, y: any, width: any, height: any): boolean;
    /**
     * Clears any data set at the specified map tile co-ordinates.
     * @param x
     * @param y
     * @return {boolean} True if data was cleared or false if no data existed.
     */
    clearData(x: any, y: any): boolean;
    /**
     * Gets / sets the map's tile data.
     * @param {Array} val The map data array.
     * @return {*}
     */
    mapData(val: any): any;
}
