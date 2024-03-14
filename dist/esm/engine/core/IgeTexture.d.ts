import type { IgeEntity } from "../../export/exports.js"
import { IgeAsset, IgeDependencies } from "../../export/exports.js"
import { IgeTextureRenderMode } from "../../export/exports.js"
import type { IgeCanvas, IgeCanvasRenderingContext2d, IgeImage, IgeSmartFilter, IgeSmartTexture, IgeTextureCellArray } from "../../export/exports.js"
/**
 * Creates a new texture.
 */
export declare class IgeTexture extends IgeAsset {
    classId: string;
    IgeTexture: boolean;
    _noDimensions: boolean;
    _sizeX: number;
    _sizeY: number;
    _renderMode: IgeTextureRenderMode;
    _loaded: boolean;
    _smoothing: boolean;
    _filterImageDrawn: boolean;
    _destroyed: boolean;
    _url?: string;
    _applyFilters: IgeSmartFilter[];
    _applyFiltersData: Record<string, any>[];
    _preFilters: IgeSmartFilter[];
    _preFiltersData: Record<string, any>[];
    _originalImage?: IgeImage;
    _textureCanvas?: IgeCanvas;
    _textureCtx?: IgeCanvasRenderingContext2d;
    _cells: IgeTextureCellArray;
    dependencies: IgeDependencies;
    image?: IgeImage;
    script?: IgeSmartTexture;
    /**
     * Constructor for a new IgeTexture.
     * @param id
     * @param {string | IgeSmartTexture} urlOrObject Either a string URL that
     * points to the path of the image or script you wish to use as
     * the texture image, or an object containing a smart texture.
     */
    constructor(id?: string, urlOrObject?: string | IgeSmartTexture);
    /**
     * Gets / sets the source file for this texture.
     * @param {string=} url "The url used to load the file for this texture.
     * @return {*}
     */
    url(url: string): this;
    url(): string | undefined;
    /**
     * Loads an image into an img tag and sets an onload event
     * to capture when the image has finished loading.
     * @param {string} imageUrl The image url used to load the
     * image data.
     * @private
     */
    _loadImage(imageUrl: string): false | undefined;
    _textureLoaded(): void;
    /**
     * Loads a render script into a script tag and sets an onload
     * event to capture when the script has finished loading.
     * @param {string} scriptUrl The script url used to load the
     * script data.
     * @private
     */
    _loadScript: (scriptUrl: string) => void;
    /**
     * Assigns a render script to the smart texture.
     * @param {string} scriptObj The script object.
     * @private
     */
    assignSmartTextureImage(scriptObj: IgeSmartTexture): void;
    /**
     * Sets the image element that the IgeTexture will use when
     * rendering. This is a special method not designed to be called
     * directly by any game code and is used specifically when
     * assigning an existing canvas element to an IgeTexture.
     * @param {IgeImage} imageElement The canvas / image to use as
     * the image data for the IgeTexture.
     * @private
     */
    _setImage(imageElement: IgeImage): void;
    /**
     * Sets the _sizeX property.
     * @param {number} val
     */
    sizeX(val: number): void;
    /**
     * Sets the _sizeY property.
     * @param {number} val
     */
    sizeY(val: number): void;
    /**
     * Resizes the original texture image to a new size. This alters
     * the image that the texture renders so all entities that use
     * this texture will output the newly resized version of the image.
     * @param {number} x The new width.
     * @param {number} y The new height.
     * @param {boolean=} dontDraw If true the resized image will not be
     * drawn to the texture canvas. Useful for just resizing the texture
     * canvas and not the output image. Use in conjunction with the
     * applyFilter() and preFilter() methods.
     */
    resize(x: number, y: number, dontDraw?: boolean): void;
    /**
     * Resizes the original texture image to a new size based on percentage.
     * This alters the image that the texture renders so all entities that use
     * this texture will output the newly resized version of the image.
     * @param {number} x The new width.
     * @param {number} y The new height.
     * @param {Boolean=} dontDraw If true the resized image will not be
     * drawn to the texture canvas. Useful for just resizing the texture
     * canvas and not the output image. Use in conjunction with the
     * applyFilter() and preFilter() methods.
     */
    resizeByPercent(x: number, y: number, dontDraw?: boolean): void;
    /**
     * Sets the texture image back to the original image that the
     * texture first loaded. Useful if you have applied filters
     * or resized the image and now want to revert to the original.
     */
    restoreOriginal(): void;
    smoothing(val?: boolean): boolean | this;
    /**
     * Renders the texture image to the passed canvas context.
     * @param {CanvasRenderingContext2D} ctx The canvas context to draw to.
     * @param {IgeEntity} entity The entity that this texture is
     * being drawn for.
     */
    render(ctx: IgeCanvasRenderingContext2d, entity: IgeEntity): void;
    /**
     * Removes a certain filter from the texture
     * Useful if you want to keep resizings, etc.
     */
    removeFilter(method: IgeSmartFilter): void;
    /**
     * Removes all filters on the texture
     * Useful if you want to keep resizings, etc.
     */
    removeFilters(): void;
    /**
     * Rerenders image with filter list. Keeps sizings.
     * Useful if you have no preFilters
     */
    _rerenderFilters(): void;
    /**
     * Gets / sets the pre-filter method that will be called before
     * the texture is rendered and will allow you to modify the texture
     * image before rendering each tick.
     * @param method
     * @param data
     * @return {*}
     */
    preFilter(method: IgeSmartFilter, data?: any): this;
    /**
     * Applies a filter to the texture. The filter is a method that will
     * take the canvas, context and originalImage parameters and then
     * use context calls to alter / paint the context with the texture
     * and any filter / adjustments that you want to apply.
     * @param {Function} method
     * @param {Object=} data
     * @return {*}
     */
    applyFilter(method: IgeSmartFilter, data?: any): this;
    /**
     * Retrieves pixel data from x,y texture coordinate (starts from top-left).
     * Important: If the texture has a cross-domain url, the image host must allow
     * cross-origin resource sharing or a security error will be thrown.
     * Reference: http://blog.chromium.org/2011/07/using-cross-domain-images-in-webgl-and.html
     * @param  {number} x
     * @param  {number} y
     * @return {Array} [r,g,b,a] Pixel data.
     */
    pixelData(x: number, y: number): Uint8ClampedArray | null;
    /**
     * Creates a clone of the texture.
     * @return {IgeTexture} A new, distinct texture with the same attributes
     * as the one being cloned.
     */
    clone(): IgeTexture;
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object.
     * @return {string}
     */
    stringify(): string;
    /**
     * Creates a new texture from a cell in the existing texture
     * and returns the new texture.
     * @param {number | string} indexOrId The cell index or id to use.
     * @return {*}
     */
    textureFromCell(indexOrId: number | string): IgeTexture;
    /**
     * Called by textureFromCell() when the texture is ready
     * to be processed. See textureFromCell() for description.
     * @param {IgeTexture} tex The new texture to paint to.
     * @param {number, String} indexOrId The cell index or id
     * to use.
     * @private
     */
    _textureFromCell(tex: IgeTexture, indexOrId: number | string): void;
    /**
     * Returns the cell index that the passed cell id corresponds
     * to.
     * @param {string} id
     * @return {number} The cell index that the cell id corresponds
     * to or -1 if a corresponding index could not be found.
     */
    cellIdToIndex(id: string): number;
    _stringify(): string;
    /**
     * Destroys the item.
     */
    destroy(): this;
}
