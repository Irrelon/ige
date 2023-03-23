import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { IgeFontEntity } from "@/engine/core/IgeFontEntity";
import { IgeFontAlignX, IgeFontAlignY } from "@/enums/IgeFontAlign";
import type { IgeFontSheet } from "@/engine/core/IgeFontSheet";
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
    constructor();
    textAlign(val?: "left" | "center" | "right"): "left" | "center" | "right" | undefined;
    textAlignX(val: IgeFontAlignX): this;
    textAlignX(): IgeFontAlignX;
    textAlignY(val: IgeFontAlignY): this;
    textAlignY(): IgeFontAlignY;
    textLineSpacing(val: number): this;
    textLineSpacing(): number;
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
    fontSheet(fontSheet?: IgeFontSheet): this | IgeFontSheet | undefined;
    font(val: string | IgeFontSheet): this;
    font(): string | IgeFontSheet;
    nativeFont(val?: string): string | this | IgeFontEntity | undefined;
    nativeStroke(val?: number): number | this | IgeFontEntity | undefined;
    nativeStrokeColor(val?: string): string | this | IgeFontEntity | undefined;
    color(val: string): this;
    color(): string;
    _mounted(): void;
}
