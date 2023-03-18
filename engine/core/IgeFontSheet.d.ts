import IgeTexture from "./IgeTexture";
/**
 * Creates a new font sheet. A font sheet is an image that contains
 * letters and numbers rendered to specifications. It allows you to
 * use and render text fonts without the font actually existing on
 * the target system that the engine is running in.
 */
declare class IgeFontSheet extends IgeTexture {
    classId: string;
    constructor(ige: any, url: any);
    decodeHeader(): any;
    _decode(canvas: any, x: any, y: any, maxX: any): any;
    lineHeightModifier(val: any): void;
    /**
     * Returns the width in pixels of the text passed in the
     * argument.
     * @param {String} text The text to measure.
     * @returns {number}
     */
    measureTextWidth(text: any): number | undefined;
    render(ctx: any, entity: any): void;
    destroy(): void;
}
export default IgeFontSheet;
