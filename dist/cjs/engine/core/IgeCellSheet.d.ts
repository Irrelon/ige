import { IgeTexture } from "../../export/exports.js"
import type { IgeImage } from "../../export/exports.js"
import type { IgeSmartTexture } from "../../export/exports.js"
/**
 * Creates a new cell sheet. Cell sheets are textures that are
 * automatically split up into individual cells based on a cell
 * width and height.
 */
export declare class IgeCellSheet extends IgeTexture {
    classId: string;
    IgeSpriteSheet: boolean;
    _cellColumns: number;
    _cellRows: number;
    _cellWidth: number;
    _cellHeight: number;
    _sheetImage?: IgeImage;
    constructor(id?: string, urlOrObject?: string | IgeSmartTexture, horizontalCells?: number, verticalCells?: number);
    _textureLoaded(): void;
    /**
     * Returns the total number of cells in the cell sheet.
     * @return {number}
     */
    cellCount(): number;
    /**
     * Gets / sets the number of horizontal cells in the cell sheet.
     * @param {number=} val The integer count of the number of horizontal cells in the cell sheet.
     */
    horizontalCells(val: number): this;
    horizontalCells(): number;
    /**
     * Gets / sets the number of vertical cells in the cell sheet.
     * @param {number=} val The integer count of the number of vertical cells in the cell sheet.
     */
    verticalCells(val: number): this;
    verticalCells(): number;
    /**
     * Sets the x, y, width and height of each sheet cell and stores
     * that information in the this._cells array.
     * @private
     */
    _applyCells(): void;
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object.
     * @return {string}
     */
    stringify(): string;
}
