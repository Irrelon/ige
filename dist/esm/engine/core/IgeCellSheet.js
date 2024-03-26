import { IgeTexture } from "./IgeTexture.js"
/**
 * Creates a new cell sheet. Cell sheets are textures that are
 * automatically split up into individual cells based on a cell
 * width and height.
 */
export class IgeCellSheet extends IgeTexture {
    classId = "IgeCellSheet";
    IgeSpriteSheet = true;
    _cellColumns = 0;
    _cellRows = 0;
    _cellWidth = 0;
    _cellHeight = 0;
    _sheetImage;
    constructor(id, urlOrObject, horizontalCells = 1, verticalCells = 1) {
        super(id, urlOrObject);
        this.horizontalCells(horizontalCells);
        this.verticalCells(verticalCells);
    }
    _textureLoaded() {
        if (this.image) {
            // Store the cell sheet image
            this._sheetImage = this.image;
            this._applyCells();
        }
        else {
            // Unable to create cells from non-image texture
            // TODO: Low-priority - Support cell sheets from smart-textures
            this.log("Cannot create cell-sheet because texture has not loaded an image!", "error");
        }
        super._assetLoaded();
    }
    /**
     * Returns the total number of cells in the cell sheet.
     * @return {number}
     */
    cellCount() {
        return this.horizontalCells() * this.verticalCells();
    }
    horizontalCells(val) {
        if (val !== undefined) {
            this._cellColumns = val;
            return this;
        }
        return this._cellColumns;
    }
    verticalCells(val) {
        if (val !== undefined) {
            this._cellRows = val;
            return this;
        }
        return this._cellRows;
    }
    /**
     * Sets the x, y, width and height of each sheet cell and stores
     * that information in the this._cells array. The _cells array
     * is first indexed at 1 not 0.
     * @private
     */
    _applyCells() {
        // Do we have an image to use?
        if (!this.image) {
            return;
        }
        if (!this._cellRows || !this._cellColumns) {
            return;
        }
        const imgWidth = this._sizeX;
        const imgHeight = this._sizeY;
        const rows = this._cellRows;
        const columns = this._cellColumns;
        const cellWidth = (this._cellWidth = imgWidth / columns);
        const cellHeight = (this._cellHeight = imgHeight / rows);
        if (cellWidth !== parseInt(cellWidth.toString(), 10)) {
            this.log(`Cell width is a floating-point number! (Image Width ${imgWidth} / Number of Columns ${columns} = ${cellWidth}) in file: ${this._url}`, "warning");
        }
        if (cellHeight !== parseInt(cellHeight.toString(), 10)) {
            this.log(`Cell height is a floating-point number! (Image Height ${imgHeight} / Number of Rows ${rows} = ${cellHeight}) in file: ${this._url}`, "warning");
        }
        if (rows > 1 || columns > 1) {
            for (let cellIndex = 1; cellIndex <= rows * columns; cellIndex++) {
                const yPos = Math.ceil(cellIndex / columns) - 1;
                const xPos = cellIndex - columns * yPos - 1;
                // Store the xy in the sheet frames variable
                this._cells[cellIndex] = [xPos * cellWidth, yPos * cellHeight, cellWidth, cellHeight];
            }
        }
        else {
            // The cell data shows only one cell so just store the whole image data
            this._cells[1] = [0, 0, this._sizeX, this._sizeY];
        }
    }
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object.
     * @return {string}
     */
    stringify() {
        const str = "new " +
            this.classId +
            "('" +
            this.url() +
            "', " +
            this.horizontalCells() +
            ", " +
            this.verticalCells() +
            ")";
        // Every object has an ID, assign that first
        // IDs are automatically generated from texture urls
        //str += ".id('" + this.id() + "');";
        return str;
    }
}
