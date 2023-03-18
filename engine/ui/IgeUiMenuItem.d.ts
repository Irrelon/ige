import { IgeUiElement } from "../core/IgeUiElement";
export declare class IgeUiMenuItem extends IgeUiElement {
    classId: string;
    menuData(menuData: any): any;
    /**
     * Gets / sets the font sheet (texture) that the menu item will
     * use when rendering text.
     * @param fontSheet
     * @return {*}
     */
    fontSheet(fontSheet: any): any;
    /**
     * Opens the menu item so it's child items are visible.
     */
    open(): void;
    /**
     * Closes the menu item so it's child items are hidden.
     */
    close(): void;
}
