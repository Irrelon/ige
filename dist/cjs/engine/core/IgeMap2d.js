"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeMap2d = void 0;
const IgeBaseClass_1 = require("./IgeBaseClass.js");
const igeClassStore_1 = require("../utils/igeClassStore.js");
/**
 * Creates a new map that has two dimensions (x and y) to its data.
 */
class IgeMap2d extends IgeBaseClass_1.IgeBaseClass {
    constructor(data) {
        super();
        this.classId = "IgeMap2d";
        this._mapData = data || [];
    }
    tileData(x, y, val) {
        if ((x === undefined || y === undefined)) {
            return;
        }
        if (val !== undefined) {
            // Assign a value
            this._mapData[y] = this._mapData[y] || [];
            this._mapData[y][x] = val;
            return this;
        }
        // No assignment so see if we have data to return
        if (this._mapData[y]) {
            return this._mapData[y][x];
        }
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
                    if (this.tileData(x + xi, y + yi)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    /**
     * Checks if the tile area passed has data stored in it that matches
     * the passed data. If so, returns true, otherwise false.
     * @param x
     * @param y
     * @param width
     * @param height
     * @param data
     */
    collisionWith(x, y, width, height, data) {
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
                    if (this.tileData(x + xi, y + yi) === data) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
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
    collisionWithOnly(x, y, width, height, data) {
        let xi, yi, tileData, withData = false;
        if (width === undefined) {
            width = 1;
        }
        if (height === undefined) {
            height = 1;
        }
        if (x !== undefined && y !== undefined) {
            for (yi = 0; yi < height; yi++) {
                for (xi = 0; xi < width; xi++) {
                    tileData = this.tileData(x + xi, y + yi);
                    if (tileData) {
                        if (this.tileData(x + xi, y + yi) === data) {
                            withData = true;
                        }
                        else {
                            return false;
                        }
                    }
                }
            }
        }
        return withData;
    }
    mapData(val, startX, startY) {
        if (val === undefined) {
            return this._mapData;
        }
        if (!startX || !startY) {
            this._mapData = val;
            return this;
        }
        // Loop the map data and apply based on the start positions
        for (let y = 0; y < val.length; y++) {
            for (let x = 0; x < val[y].length; x++) {
                this._mapData[startY + y][startX + x] = val[y][x];
            }
        }
        return this;
    }
    sortedMapDataAsArray() {
        const data = this.mapData();
        const finalData = [];
        const yArr = this._sortKeys(data);
        for (let i = 0; i < yArr.length; i++) {
            const y = yArr[i];
            const xArr = this._sortKeys(data[y]);
            finalData[y] = finalData[y] || [];
            for (let k = 0; k < xArr.length; k++) {
                const x = xArr[k];
                finalData[y][x] =
                    data[y][x];
            }
        }
        return finalData;
    }
    _sortKeys(obj) {
        return Object.keys(obj).sort();
    }
    /**
     * Returns a string of the map's data in JSON format.
     * @return {string}
     */
    mapDataString() {
        return JSON.stringify(this.mapData());
    }
    translateDataBy(transX, transY) {
        const yArr = this.mapData();
        const newArr = [];
        for (let y = 0; y < yArr.length; y++) {
            const xArr = yArr[y];
            newArr[y + transY] = newArr[y + transY] || [];
            for (let x = 0; x < xArr.length; x++) {
                newArr[y + transY][x + transX] = yArr[y][x];
            }
        }
        this.mapData(newArr, 0, 0);
    }
}
exports.IgeMap2d = IgeMap2d;
(0, igeClassStore_1.registerClass)(IgeMap2d);
