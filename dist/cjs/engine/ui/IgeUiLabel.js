"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiLabel = void 0;
const IgeFontEntity_1 = require("../core/IgeFontEntity.js");
const IgeUiElement_1 = require("../core/IgeUiElement.js");
const igeClassStore_1 = require("../utils/igeClassStore.js");
const enums_1 = require("../../enums/index.js");
/**
 * Provides a UI label entity. Basic on-screen text label.
 */
class IgeUiLabel extends IgeUiElement_1.IgeUiElement {
    constructor(label = "") {
        super();
        this.classId = "IgeUiLabel";
        this._placeHolder = "";
        this._placeHolderColor = "";
        this._mask = "";
        this._widthFromText = true;
        this._valueChanged = true;
        this._fontEntity = new IgeFontEntity_1.IgeFontEntity()
            .left(0)
            .middle(0)
            .textAlignX(enums_1.IgeFontAlignX.left)
            .textAlignY(enums_1.IgeFontAlignY.middle)
            .textLineSpacing(10);
        this._fontEntity.mount(this);
        // Set defaults
        this.font("10px Verdana");
        this.allowActive(false);
        this.allowFocus(false);
        this.allowHover(false);
        if (label) {
            this.value(label);
        }
    }
    textAlignX(val) {
        if (val !== undefined) {
            this._fontEntity.textAlignX(val);
            return this;
        }
        return this._fontEntity.textAlignX();
    }
    textAlignY(val) {
        if (val !== undefined) {
            this._fontEntity.textAlignY(val);
            return this;
        }
        return this._fontEntity.textAlignY();
    }
    textLineSpacing(val) {
        if (val !== undefined) {
            this._fontEntity.textLineSpacing(val);
            return this;
        }
        return this._fontEntity.textLineSpacing();
    }
    autoWrap(val) {
        if (val !== undefined) {
            return this._fontEntity.autoWrap(val);
        }
        return this._fontEntity.autoWrap();
    }
    width(px, lockAspect = false, modifier, noUpdate = false) {
        if (px !== undefined) {
            // Call the main super class method
            const returnValue = super.width(px, lockAspect, modifier, noUpdate);
            this._fontEntity.width(super.width(), lockAspect, modifier, noUpdate);
            return returnValue;
        }
        return this._fontEntity.width();
    }
    height(px, lockAspect = false, modifier, noUpdate = false) {
        if (px !== undefined) {
            // Call the main super class method
            const returnValue = super.height(px, lockAspect, modifier, noUpdate);
            this._fontEntity.height(super.height(), lockAspect, modifier, noUpdate);
            return returnValue;
        }
        return this._fontEntity.height();
    }
    value(val) {
        if (val === undefined) {
            return this._value;
        }
        if (this._value === val) {
            return this;
        }
        this._valueChanged = true;
        this._value = val;
        if (!val && this._placeHolder) {
            // Assign placeholder text and color
            this._fontEntity.text(this._placeHolder);
            this._fontEntity.color(this._placeHolderColor);
        }
        else {
            // Set the text of the font entity to the value
            if (!this._mask) {
                // Assign text directly
                this._fontEntity.text(this._value);
            }
            else {
                // Assign a mask value instead
                this._fontEntity.text(new Array(this._value.length + 1).join(this._mask));
            }
            this._fontEntity.color(this._color);
        }
        this.emit("change", this._value);
        return this;
    }
    fontSheet(fontSheet) {
        if (fontSheet === undefined) {
            return this._fontSheet;
        }
        this._fontSheet = fontSheet;
        // Set the font sheet as the texture for our font entity
        this._fontEntity.texture(fontSheet);
        return this;
    }
    font(val) {
        if (val !== undefined) {
            if (typeof val === "string") {
                // Native font name
                return this.nativeFont(val);
            }
            else {
                // Font sheet
                return this.fontSheet(val);
            }
        }
        if (this._fontEntity._nativeMode) {
            // Return native font
            return this.nativeFont();
        }
        else {
            // Return font sheet
            return this.fontSheet();
        }
    }
    nativeFont(val) {
        if (val !== undefined) {
            this._fontEntity.nativeFont(val);
            return this;
        }
        return this._fontEntity.nativeFont();
    }
    nativeStroke(val) {
        if (val !== undefined) {
            this._fontEntity.nativeStroke(val);
            return this;
        }
        return this._fontEntity.nativeStroke();
    }
    nativeStrokeColor(val) {
        if (val !== undefined) {
            this._fontEntity.nativeStrokeColor(val);
            return this;
        }
        return this._fontEntity.nativeStrokeColor();
    }
    color(val) {
        if (val !== undefined) {
            this._color = val;
            if (!this._value && this._placeHolder && this._placeHolderColor) {
                this._fontEntity.color(this._placeHolderColor);
            }
            else {
                this._fontEntity.color(val);
            }
            return this;
        }
        return this._color;
    }
    update(tickDelta) {
        if (this._widthFromText && this._valueChanged !== this._value) {
            this._valueChanged = false;
            this.width(this._fontEntity.measureTextWidth(this._value || " ") + this._paddingLeft + this._paddingRight);
        }
        super.update(tickDelta);
    }
    _mounted() {
        // Check if we have a text value
        if (!this._value && this._placeHolder) {
            // Assign placeholder text and color
            this._fontEntity.text(this._placeHolder);
            this._fontEntity.color(this._placeHolderColor);
        }
        super._mounted();
    }
}
exports.IgeUiLabel = IgeUiLabel;
(0, igeClassStore_1.registerClass)(IgeUiLabel);
