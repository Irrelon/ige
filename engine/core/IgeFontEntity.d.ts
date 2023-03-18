import { IgeUiEntity } from "./IgeUiEntity";
import { IgeFontAlignX, IgeFontAlignY } from "../../enums/IgeFontAlign";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";
/**
 * Creates a new font entity. A font entity will use a font sheet
 * (IgeFontSheet) or native font and render text.
 */
export declare class IgeFontEntity extends IgeUiEntity {
    "classId": string;
    _renderText?: string;
    _text?: string;
    _textAlignX: IgeFontAlignX;
    _textAlignY: IgeFontAlignY;
    _textLineSpacing: number;
    _nativeMode: boolean;
    _nativeFont?: string;
    _nativeStroke?: number;
    _nativeStrokeColor?: string;
    _autoWrap: boolean;
    _colorOverlay?: string;
    _bindDataObject?: any;
    _bindDataProperty?: string;
    _bindDataPreText?: string;
    _bindDataPostText?: string;
    constructor();
    /**
     * Extends the IgeUiEntity.width() method and if the value being
     * set is different from the current width value then the font's
     * cache is invalidated so it gets redrawn.
     * @param px
     * @param [lockAspect]
     * @param [modifier]
     * @param [noUpdate]
     * @returns {*}
     */
    width(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
    width(): number;
    /**
     * Extends the IgeUiEntity.height() method and if the value being
     * set is different from the current height value then the font's
     * cache is invalidated so it gets redrawn.
     * @param px
     * @param [lockAspect]
     * @param [modifier]
     * @param [noUpdate]
     * @returns {*|number}
     */
    height(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
    height(): number;
    /**
     * Sets the text to render for this font entity. This sets both
     * the private properties "_text" and "_renderText". If auto-wrapping
     * has been enabled then the "_text" remains equal to whatever
     * text you pass into this method but "_renderText" becomes the
     * line-broken text that the auto-wrapper method creates. When the
     * entity renders its text string it ALWAYS renders from "_renderText"
     * and not the value of "_text". Effectively this means that "_text"
     * contains the unaltered version of your original text and
     * "_renderText" will be either the same as "_text" if auto-wrapping
     * is disabled or a wrapped version otherwise.
     * @param {String} text The text string to render.
     * @returns {*}
     */
    text(text?: string): string | this | undefined;
    /**
     * Allows you to bind the text output of this font entity to match
     * the value of an object's property so that when it is updated the
     * text will automatically update on this entity. Useful for score,
     * position etc. output where data is stored in an object and changes
     * frequently.
     * @param {Object} obj The object to read the property from.
     * @param {String} propName The name of the property to read value from.
     * @param {String} preText Text to place before the output.
     * @param {String} postText Text to place after the output.
     * @returns {*}
     */
    bindData(obj: any, propName: string, preText?: string, postText?: string): this;
    /**
     * Gets / sets the current horizontal text alignment. Accepts
     * a value of 0, 1 or 2 (left, centre, right) respectively.
     * @param {Number} val The new value.
     * @returns {*}
     */
    textAlignX(val: IgeFontAlignX): this;
    textAlignX(): IgeFontAlignX;
    /**
     * Gets / sets the current vertical text alignment. Accepts
     * a value of 0, 1, 2, 3 (top, middle, bottom, justified) respectively.
     * Defaults to 3 (justified)
     * @param {Number} val The new value.
     * @returns {*}
     */
    textAlignY(val: IgeFontAlignY): this;
    textAlignY(): IgeFontAlignY;
    /**
     * Gets / sets the amount of spacing between the lines of text being
     * rendered. Accepts negative values as well as positive ones.
     * @param {Number=} val
     * @returns {*}
     */
    textLineSpacing(val: number): this;
    textLineSpacing(): number;
    /**
     * Gets / sets the string hex or rgba value of the colour
     * to use as an overlay when rending this entity's texture.
     * @param {String=} val The colour value as hex e.g. '#ff0000'
     * or as rgba e.g. 'rbga(255, 0, 0, 0.5)'. To remove an overlay
     * colour simply passed an empty string.
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    colorOverlay(val?: string): string | this | undefined;
    /**
     * A proxy for colorOverlay().
     */
    color(val: string): this;
    color(): string;
    /**
     * Clears the texture cache for this entity's text string.
     */
    clearCache(): void;
    /**
     * When using native font rendering (canvasContext.fillText())
     * this sets the font and size as per the canvasContext.font
     * string specification.
     * @param {String=} val The font style string.
     * @return {*} "this" when arguments are passed to allow method
     * chaining or the current value if no arguments are specified.
     */
    nativeFont(val?: string): string | this | undefined;
    /**
     * Gets / sets the text stroke size that applies when using
     * a native font for text rendering.
     * @param {Number=} val The size of the text stroke.
     * @return {*}
     */
    nativeStroke(val?: number): number | this | undefined;
    /**
     * Gets / sets the text stroke color that applies when using
     * a native font for text rendering.
     * @param val The color of the text stroke.
     * @return {*}
     */
    nativeStrokeColor(val?: string): string | this | undefined;
    /**
     * Gets / sets the auto-wrapping mode. If set to true then the
     * text this font entity renders will be automatically line-broken
     * when a line reaches the width of the entity.
     * @param val
     * @returns {*}
     */
    autoWrap(val?: boolean): boolean | this;
    /**
     * Automatically detects where line-breaks need to occur in the text
     * assigned to the entity and adds them.
     * @private
     */
    _applyAutoWrap(): void;
    /**
     * Will measure and return the width in pixels of a line or multiple
     * lines of text. If no text parameter is passed, will use the current
     * text assigned to the font entity.
     * @param {String=} text Optional text to measure, used existing entity
     * text value if none is provided.
     * @returns {Number} The width of the text in pixels.
     */
    measureTextWidth(text?: string): any;
    tick(ctx: IgeCanvasRenderingContext2d): void;
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object's properties via
     * chained commands. This method will only check for
     * properties that are directly related to this class.
     * Other properties are handled by their own class method.
     * @return {String}
     */
    _stringify(): string;
}
