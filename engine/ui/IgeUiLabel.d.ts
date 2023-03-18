/**
 * Provides a UI label entity. Basic on-screen text label.
 */
import IgeUiElement from "../core/IgeUiElement";
import IgeFontEntity from "../core/IgeFontEntity";
import { IgeFontAlignX, IgeFontAlignY } from "../../enums/IgeFontAlign";
import type IgeFontSheet from "../core/IgeFontSheet";
export declare class IgeUiLabel extends IgeUiElement {
    classId: string;
    _fontEntity: IgeFontEntity;
    _alignText?: "left" | "center" | "right";
    _placeHolder: string;
    _placeHolderColor: string;
    _mask: string;
    _fontSheet?: IgeFontSheet;
    constructor();
    textAlign(val?: "left" | "center" | "right"): "center" | "left" | "right" | undefined;
    textAlignX(val: IgeFontAlignX): this;
    textAlignX(): IgeFontAlignX;
    textAlignY(val: IgeFontAlignY): this;
    textAlignY(): IgeFontAlignY;
    textLineSpacing(val?: number): number | IgeFontEntity;
    autoWrap(val?: boolean): boolean | IgeFontEntity;
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
    width(): number;
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
    height(): number;
    /**
     * Gets / sets the text value of the label.
     * @param {String=} val The text value.
     * @return {*}
     */
    value(val: string): this;
    value(): string;
    /**
     * Gets / sets the font sheet (texture) that the text box will
     * use when rendering text inside the box.
     * @param fontSheet
     * @return {*}
     */
    fontSheet(fontSheet?: IgeFontSheet): IgeFontSheet | this | undefined;
    font(val?: string | IgeFontSheet): string | IgeFontEntity | IgeFontSheet | this | undefined;
    nativeFont(val?: string): string | IgeFontEntity | this | undefined;
    nativeStroke(val?: number): number | IgeFontEntity | this | undefined;
    nativeStrokeColor(val?: string): string | IgeFontEntity | this | undefined;
    color(val: string): this;
    color(): string;
    _mounted(): void;
}
