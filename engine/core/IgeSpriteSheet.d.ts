import IgeTexture from "./IgeTexture";
import { IgeSmartTexture } from "../../types/IgeSmartTexture";
import { IgeImage } from "./IgeImage";
import { IgeCanvas } from "./IgeCanvas";
type IgeTextureCell = [number, number, number, number, string?];
type IgeTextureCellArray = IgeTextureCell[];
/**
 * Creates a new sprite sheet that cuts an image up into
 * arbitrary sections.
 */
declare class IgeSpriteSheet extends IgeTexture {
    classId: string;
    IgeSpriteSheet: boolean;
    _cells: IgeTextureCellArray;
    _spriteCells: IgeTextureCellArray;
    _sheetImage?: IgeImage | IgeCanvas;
    _checkModulus?: boolean;
    constructor(id?: string, urlOrObject?: string | IgeSmartTexture, cells?: IgeTextureCellArray);
    _textureLoaded(): void;
    /**
     * Checks if a pixel is completely transparent.
     * @param {ImageData} imageData The image data to check.
     * @param {Number} x X co-ordinate to check.
     * @param {Number} y Y co-ordinate to check.
     * @returns {boolean} True if transparent, false if not.
     */
    isPixelTransparent(imageData: ImageData, x: number, y: number): boolean;
    /**
     * Makes a pixel transparent at a particular co-ordinate.
     * @param {ImageData} imageData The image data to modify.
     * @param {Number} x X co-ordinate to modify.
     * @param {Number} y Y co-ordinate to modify.
     * @returns {undefined} Nothing
     */
    makePixelTransparent(imageData: ImageData, x: number, y: number): void;
    /**
     * Reads the pixel value at the passed co-ordinates.
     * @param {ImageData} imageData The image data to read.
     * @param {Number} x X co-ordinate to read from.
     * @param {Number} y Y co-ordinate to read from.
     * @returns {{a: *, r: *, b: *, g: *}} Object with the argb
     * values of the pixel.
     */
    getPixelAt(imageData: ImageData, x: number, y: number): {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    /**
     * Uses the sprite sheet image pixel data to detect distinct sprite
     * bounds.
     * @param {Image} img The image to detect cells in.
     * @return {Array} An array of cell bounds.
     */
    detectCells(img: IgeImage | IgeCanvas): IgeTextureCellArray;
    _pixelInRects(rects: IgeTextureCellArray, x: number, y: number): boolean;
    _determineRect(pixels: ImageData, x: number, y: number): IgeTextureCell;
    /**
     * Returns the total number of cells in the cell sheet.
     * @return {Number}
     */
    cellCount(): number;
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object.
     * @return {String}
     */
    stringify(): string;
}
export default IgeSpriteSheet;
