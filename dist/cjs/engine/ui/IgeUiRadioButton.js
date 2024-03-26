"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiRadioButton = void 0;
const IgeUiButton_1 = require("./IgeUiButton.js");
const igeClassStore_1 = require("../utils/igeClassStore.js");
class IgeUiRadioButton extends IgeUiButton_1.IgeUiButton {
    constructor() {
        super(...arguments);
        this.classId = "IgeUiRadioButton";
        this._uiSelected = false;
        this._parent = null;
    }
    radioGroup(val) {
        if (val !== undefined) {
            this._uiRadioGroup = val;
            return this;
        }
        return this._uiRadioGroup;
    }
    _deselectChildren(parent) {
        if (!parent)
            return;
        // Loop the parent object's children, find any
        // radio buttons that belong to this radio group
        // and then deselect them
        const childrenArr = parent._children;
        let arrCount = childrenArr.length, item;
        while (arrCount--) {
            item = childrenArr[arrCount];
            if (item === this)
                continue;
            if (item._uiRadioGroup !== this._uiRadioGroup)
                continue;
            // The item is part of the same radio group!
            if (!item._uiSelected)
                continue;
            // The item is selected so un-select it!
            item._uiSelected = false;
            // Fire the item's onDeSelect method
            if (!item._uiOnDeSelect)
                continue;
            item._uiOnDeSelect();
        }
    }
    select(val) {
        if (val !== undefined) {
            this._uiOnSelect = val;
            return this;
        }
        this._deselectChildren(this._parent);
        // Now set this item as selected
        this._uiSelected = true;
        // Fire this item's onSelect method
        if (this._uiOnSelect) {
            this._uiOnSelect();
        }
        return this;
    }
    deSelect(val) {
        if (val !== undefined) {
            this._uiOnDeSelect = val;
            return this;
        }
        this._uiSelected = false;
        if (this._uiOnDeSelect) {
            this._uiOnDeSelect();
        }
        return this;
    }
}
exports.IgeUiRadioButton = IgeUiRadioButton;
(0, igeClassStore_1.registerClass)(IgeUiRadioButton);
