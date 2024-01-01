import { IgeBaseClass } from "./IgeBaseClass.js"
import { arrPull } from "../utils.js"
/**
 * Creates a new map that has two dimensions (x and y) to its data
 * and allows multiple items to be stored or "stacked" on a single
 * x, y map position.
 */
export class IgeMapStack2d extends IgeBaseClass {
    classId = "IgeMapStack2d";
    _mapData;
    constructor(data) {
        super();
        this._mapData = data || [];
    }
    /**
     * Gets / sets the data stored at the specified map tile co-ordinates. If data already
     * exists at the specified co-ordinates, it is replaced with the passed data.
     * @param {number} x
     * @param {number} y
     * @param {Array=} val The array of data items to set at the specified co-ordinates.
     * @return {*} This or an array of data items at the specified co-ordinates.
     */
    tileData(x, y, val) {
        if (x !== undefined && y !== undefined) {
            if (val !== undefined) {
                // Assign a value
                this._mapData[y] = this._mapData[y] || [];
                this._mapData[y][x] = [];
                this._mapData[y][x].push(val);
                return this;
            }
            else {
                // No assignment so see if we have data to return
                if (this._mapData[y] !== undefined) {
                    return this._mapData[y][x];
                }
            }
        }
        // Either no x, y was specified or there was
        // no data at the x, y so return undefined
        return undefined;
    }
    /**
     * Gets the data stored at the specified co-ordinates and index.
     * @param {number} x
     * @param {number} y
     * @param {number} index
     * @return {*} The current data stored at the specified point or undefined if no data exists.
     */
    tileDataAtIndex(x, y, index) {
        if (this._mapData[y] && this._mapData[y][x]) {
            return this._mapData[y][x][index];
        }
        return undefined;
    }
    /**
     * Adds a data item to the specified map tile co-ordinates.
     * @param {number} x
     * @param {number} y
     * @param {*} val The data to add.
     * @return {*} This on success or false on failure.
     */
    push(x, y, val) {
        if (val !== undefined) {
            this._mapData[y] = this._mapData[y] || [];
            this._mapData[y][x] = this._mapData[y][x] || [];
            this._mapData[y][x].push(val);
            return this;
        }
        return false;
    }
    /**
     * Removes a data item from the specified map tile co-ordinates.
     * @param {number} x
     * @param {number} y
     * @param {*} val The data to remove.
     * @return {*} This on success or false on failure.
     */
    pull(x, y, val) {
        if (this._mapData[y] && this._mapData[y][x]) {
            arrPull(this._mapData[y][x], val);
            return this;
        }
        return false;
    }
    /**
     * Checks if the tile area passed has any data stored in it. If
     * so, returns true, otherwise false.
     * @param x
     * @param y
     * @param width
     * @param height
     */
    collision(x, y, width, height) {
        let xi, yi;
        if (width === undefined) {
            width = 1;
        }
        if (height === undefined) {
            height = 1;
        }
        if (x !== undefined && y !== undefined) {
            for (yi = 0; yi < height; yi++) {
                for (xi = 0; xi < width; xi++) {
                    if (this._mapData[y + yi] && this._mapData[y + yi][x + xi] && this._mapData[y + yi][x + xi].length) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    /**
     * Clears any data set at the specified map tile co-ordinates.
     * @param x
     * @param y
     * @return {boolean} True if data was cleared or false if no data existed.
     */
    clearData(x, y) {
        if (x !== undefined && y !== undefined) {
            if (this._mapData[y] !== undefined) {
                delete this._mapData[y][x];
                return true;
            }
        }
        return false;
    }
    /**
     * Gets / sets the map's tile data.
     * @param {Array} val The map data array.
     * @return {*}
     */
    mapData(val) {
        if (val !== undefined) {
            this._mapData = val;
            return this;
        }
        return this._mapData;
    }
}
