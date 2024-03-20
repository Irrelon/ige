import { IgeFontEntity } from "../core/IgeFontEntity.js"
import type { IgeFontSheet } from "../core/IgeFontSheet.js";
import { IgeUiElement } from "../core/IgeUiElement.js"
import { IgeFontAlignX, IgeFontAlignY } from "../../enums/index.js";
/**
 * Provides a UI label entity. Basic on-screen text label.
 */
export declare class IgeUiLabel extends IgeUiElement {
    classId: string;
    _fontEntity: IgeFontEntity;
    _alignText?: "left" | "center" | "right";
    _placeHolder: string;
    _placeHolderColor: string;
    _mask: string;
    _fontSheet?: IgeFontSheet;
    _widthFromText: boolean;
    _valueChanged: boolean;
    constructor(label?: string);
    textAlignX(): IgeFontAlignX;
    textAlignX(val: IgeFontAlignX): this;
    textAlignY(): IgeFontAlignY;
    textAlignY(val: IgeFontAlignY): this;
    textLineSpacing(): number;
    textLineSpacing(val: number): this;
    autoWrap(val?: boolean): boolean | IgeFontEntity;
    width(): number;
    /**
     * Extended method to auto-update the width of the child
     * font entity automatically to fill the text box.
     * @param px
     * @param lockAspect
     * @param modifier
     * @param noUpdate
     * @return {*}
     */
    width(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
    height(): number;
    /**
     * Extended method to auto-update the height of the child
     * font entity automatically to fill the text box.
     * @param px
     * @param lockAspect
     * @param modifier
     * @param noUpdate
     * @return {*}
     */
    height(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
    value(): string;
    /**
     * Gets / sets the text value of the label.
     * @param {String=} val The text value.
     * @return {*}
     */
    value(val: string): this;
    fontSheet(): IgeFontSheet | undefined;
    /**
     * Gets / sets the font sheet (texture) that the text box will
     * use when rendering text inside the box.
     * @param fontSheet
     * @return {*}
     */
    fontSheet(fontSheet: IgeFontSheet): this;
    font(): string | IgeFontSheet;
    font(val: string | IgeFontSheet): this;
    nativeFont(val: string): this;
    nativeFont(): string | undefined;
    nativeStroke(val: number): this;
    nativeStroke(): number | undefined;
    nativeStrokeColor(val: string): this;
    nativeStrokeColor(): string | undefined;
    color(): string | CanvasGradient | CanvasPattern;
    color(val: string): this;
    update(tickDelta: number): void;
    _mounted(): void;
}
