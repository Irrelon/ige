"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiMenu = void 0;
const IgeUiElement_1 = require("../core/IgeUiElement.js");
const igeClassStore_1 = require("../igeClassStore.js");
const IgeUiMenuItem_1 = require("./IgeUiMenuItem.js");
/**
 * Provides a UI drop-down menu entity.
 */
class IgeUiMenu extends IgeUiElement_1.IgeUiElement {
    constructor() {
        super(...arguments);
        this.classId = "IgeUiMenu";
    }
    /**
     * Gets / sets the menu definition.
     * @param {Object=} val The menu definition object.
     * @return {*}
     */
    menuData(val) {
        if (val !== undefined) {
            this._menuData = val;
            // Remove all existing children from the menu
            this.destroyChildren();
            // Build the new menu
            this._buildMenu(this._menuData, this);
            return this;
        }
        return this._menuData;
    }
    menuMode(mode) {
        if (mode !== undefined) {
            this._menuMode = mode;
            return this;
        }
        return this._menuMode;
    }
    /**
     * Gets / sets the font sheet (texture) that the text box will
     * use when rendering text inside the box.
     * @param fontSheet
     * @return {*}
     */
    fontSheet(fontSheet) {
        if (fontSheet !== undefined) {
            this._fontSheet = fontSheet;
            return this;
        }
        return this._fontSheet;
    }
    addItem(item) {
        if (item !== undefined) {
        }
    }
    _buildMenu(data, parent) {
        let arrCount = data.length, i, item, ent, left = 0, top = 0;
        for (i = 0; i < arrCount; i++) {
            item = data[i];
            if (this._menuMode) {
                top += this.height();
            }
            ent = new IgeUiMenuItem_1.IgeUiMenuItem()
                .backgroundColor("#666666")
                .left(left)
                .middle(top)
                .height(this.height())
                .fontSheet(this._fontSheet)
                .menuData(item)
                .mount(parent);
            if (!this._menuMode) {
                left += item.width;
            }
        }
    }
}
exports.IgeUiMenu = IgeUiMenu;
(0, igeClassStore_1.registerClass)(IgeUiMenu);
