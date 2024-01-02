import { IgeUiElement } from "../core/IgeUiElement.js"
/**
 * Provides a UI drop-down menu entity.
 */
export declare class IgeUiMenu extends IgeUiElement {
    classId: string;
    /**
     * Gets / sets the menu definition.
     * @param {Object=} val The menu definition object.
     * @return {*}
     */
    menuData(val: any): any;
    menuMode(mode: any): any;
    /**
     * Gets / sets the font sheet (texture) that the text box will
     * use when rendering text inside the box.
     * @param fontSheet
     * @return {*}
     */
    fontSheet(fontSheet: any): any;
    addItem(item: any): void;
    _buildMenu(data: any, parent: any): void;
}
