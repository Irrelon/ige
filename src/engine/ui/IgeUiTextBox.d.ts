import { IgeFontEntity } from "@/engine/core/IgeFontEntity";
import type { IgeFontSheet } from "@/engine/core/IgeFontSheet";
import { IgeUiElement } from "@/engine/core/IgeUiElement";

/**
 * Provides a UI text entry box. When provided with focus this UI entity will
 * capture keyboard input and display it, similar in usage to the HTML input
 * text element.
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
	 * Gets / sets the text value of the input box.
	 * @param {String=} val The text value.
	 * @return {*}
	 */
	value(val: string): this;
	value(): string;
	placeHolder(val: string): this;
	placeHolder(): string;
	placeHolderColor(val?: string): string | this;
	mask(val?: string): string | this;
	/**
	 * Gets / sets the font sheet (texture) that the text box will
	 * use when rendering text inside the box.
	 * @param fontSheet
	 * @return {*}
	 */
	fontSheet(fontSheet?: IgeFontSheet): IgeFontSheet | this | undefined;
	font(val?: string | IgeFontSheet): string | IgeFontSheet | this | IgeFontEntity | undefined;
	nativeFont(val?: string): string | this | IgeFontEntity | undefined;
	nativeStroke(val?: number): number | this | IgeFontEntity | undefined;
	nativeStrokeColor(val?: string): string | this | IgeFontEntity | undefined;
	color(color?: string | CanvasGradient | CanvasPattern): this;
	color(): string | CanvasGradient | CanvasPattern;
	_mounted(): void;
	destroy(): this;
}
