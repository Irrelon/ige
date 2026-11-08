import { IgeFontEntity } from "../core/IgeFontEntity.js"
import type { IgeFontSheet } from "../core/IgeFontSheet.js";
import { IgeUiElement } from "../core/IgeUiElement.js"
/**
 * Provides a UI text entry box. When provided with focus this UI entity will
 * capture keyboard input and display it, similar in usage to the HTML input
 * text element. Font defaults to aligning h-left and v-middle. You can change
 * this by accessing the textBox._fontEntity.textAlignY(IgeFontAlignY).
 */
export declare class IgeUiTextBox extends IgeUiElement {
    classId: string;
    _caretStart: number | null;
    _caretEnd: number | null;
    _fontEntity: IgeFontEntity;
    _fontSheet?: IgeFontSheet;
    _domElement?: HTMLInputElement;
    _placeHolder: string;
    _placeHolderColor: string;
    _mask: string;
    constructor();
    /**
     * Gets / sets the textbox width.
     * This method has been extended here to auto-update the width of the child
     * font entity automatically to fill the text box when changes occur to the
     * width of this entity.
     * @return {*}
     */
    /**
     * Gets / sets the textbox width.
     * This method has been extended here to auto-update the width of the child
     * font entity automatically to fill the text box when changes occur to the
     * width of this entity.
     */
    width(): number;
    width(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
    /**
     * Gets / sets the textbox height.
     * Extended method to auto-update the height of the child
     * font entity automatically to fill the text box.
     */
    height(): number;
    height(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
    /**
     * Gets / sets the text value of the input box.
     */
    value(): string;
    value(val: string): this;
    /**
     * Gets / sets the placeholder text that is displayed inside the
     * textbox when no current value is present.
     * @param val
     */
    placeHolder(val: string): this;
    placeHolder(): string;
    /**
     * Gets / sets the font colour for the placeholder text.
     * @param val
     */
    placeHolderColor(val: string): this;
    placeHolderColor(): string;
    /**
     * Gets / sets the text mask character to use that masks the input
     * of the text rather than displaying the actual value. Useful for
     * password entry boxes or other sensitive data. Will display one
     * mask character per value character e.g.
     * 		value = "hello"
     * 		mask = "*"
     * 		textbox will show: *****
     * @param val
     */
    mask(val: string): this;
    mask(): string;
    /**
     * Gets / sets the font sheet (texture) that the text box will
     * use when rendering text inside the box.
     * @param fontSheet
     * @return {*}
     */
    fontSheet(fontSheet: IgeFontSheet): this;
    fontSheet(): IgeFontSheet | undefined;
    /**
     * Gets / sets the current font for the textbox. If you pass
     * a string, the textbox will automatically use native font
     * rendering (use the canvas drawText() function). You can pass
     *
     * @example Get the current font
     * 		const currentFont = textbox.font()
     *
     * @example Use a Native Font
     * 		textbox.font("12px Verdana");
     *
     * @example Use an IgeFontSheet
     * 		textbox.font(fontSheetInstance);
     *
     * @param val
     */
    font(): string | IgeFontSheet | undefined;
    font(val: string | IgeFontSheet): this;
    /**
     * Explicitly set the font to a native font.
     * @see font
     * @param val
     */
    nativeFont(val: string): this;
    nativeFont(): string;
    /**
     * Gets / sets the native font's stroke setting (how thick the font
     * lines are). This is used in the canvas drawText() call.
     *
     * @example Set the stroke width to 2
     * 		textbox.nativeStroke(2);
     *
     * @param val
     */
    nativeStroke(val: number): this;
    nativeStroke(): number | undefined;
    /**
     * Gets / sets the native font's stroke colour.
     *
     * @example Set the stroke colour to red
     * 		textbox.nativeStroke("#ff0000");
     *
     * @param val
     */
    nativeStrokeColor(val: string): this;
    nativeStrokeColor(): string | undefined;
    /**
     * Gets / sets the font colour of the textbox text displayed
     * when the user types into the textbox.
     *
     * @example Set the text colour to black
     * 		textbox.color("#000000");
     *
     * @param color
     */
    color(): string | CanvasGradient | CanvasPattern;
    color(color?: string | CanvasGradient | CanvasPattern): this;
    _resolveTextColor(): void;
    _mounted(): void;
    destroy(): this;
}
