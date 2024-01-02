import { IgeTexture } from "./IgeTexture";
import { IgeSmartTexture } from "@/types/IgeSmartTexture";

/**
 * Creates a new font sheet. A font sheet is an image that contains
 * letters and numbers rendered to specifications. It allows you to
 * use and render text fonts without the font actually existing on
 * the target system that the engine is running in.
 */
export declare class IgeFontSheet extends IgeTexture {
	classId: string;
	_sheetImage?: ImageBitmap | OffscreenCanvas;
	_lineHeightModifier: number;
	_fontData: any;
	_charCodeMap: any;
	_charPosMap: any;
	_measuredWidthMap: any;
	_pixelWidthMap: any;
	constructor(id: string, urlOrObject?: string | IgeSmartTexture);
	decodeHeader(): any;
	_decode(canvas: OffscreenCanvas, x: number, y: number, maxX: number): any;
	lineHeightModifier(val?: number): void;
	/**
	 * Returns the width in pixels of the text passed in the
	 * argument.
	 * @param {string} text The text to measure.
	 * @returns {number}
	 */
	measureTextWidth(text: any): any;
	render(ctx: any, entity: any): void;
	destroy(): this;
}
