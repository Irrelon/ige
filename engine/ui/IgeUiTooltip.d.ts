import { IgeUiElement } from "../core/IgeUiElement";
/**
 * Provides a UI tooltip. Change properties (textBox, fonts, backgroundcolor)
 * at free will.
 */
export declare class IgeUiTooltip extends IgeUiElement {
    classId: string;
    /**
     * @constructor
     * @param parent Where the mousemove is captured i.e. on which element the tooltip should appear
     * @param mountEntity Where the tooltip should be mounted. A scene is suggested.
     * @param width Width of the tooltip
     * @param height Height of the tooltip
     * @param content The content which is set with public method "setContent". Can be string, array(2) or an entity
     */
    constructor(parent: any, mountEntity: any, width: any, height: any, content: any);
    /**
     * Extended method to auto-update the width of the child
     * font entity automatically to fill the text box.
     * @param px
     * @param lockAspect
     * @param modifier
     * @param noUpdate
     * @return {*}
     */
    width(px: any, lockAspect: any, modifier: any, noUpdate: any): this;
    /**
     * Extended method to auto-update the height of the child
     * font entity automatically to fill the text box.
     * @param px
     * @param lockAspect
     * @param modifier
     * @param noUpdate
     * @return {*}
     */
    height(px: any, lockAspect: any, modifier: any, noUpdate: any): this;
    /**
     * Sets the content of the tooltip. Can be a string for
     * simple text, an array with two strings for text and title
     * or a whole entity
     * @param val The content, be it string, array(2) or an entity
     * @return {*}
     */
    setContent(val: any): this | undefined;
    /**
     * Gets / sets the font sheet (texture) that the text box will
     * use when rendering text inside the box.
     * @param fontSheet
     * @return {*}
     */
    fontSheet(fontSheet: any): this | undefined;
    /**
     * Handles mousemove event to show the textbox and adjust its
     * position according to the mouse position
     * @param event
     * @private
     */
    _mousemove(event: any): void;
    /**
     * Handles mouseout event to hide the tooltip
     * @param event
     * @private
     */
    _mouseout(event: any): void;
}
