"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiTextBox = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const exports_3 = require("../../export/exports.js");
const exports_4 = require("../../export/exports.js");
/**
 * Provides a UI text entry box. When provided with focus this UI entity will
 * capture keyboard input and display it, similar in usage to the HTML input
 * text element.
 */
//TODO: Make cursor a text entry cursor on hover
class IgeUiTextBox extends exports_3.IgeUiElement {
    constructor() {
        super();
        this.classId = "IgeUiTextBox";
        this._caretStart = 0;
        this._caretEnd = 0;
        this._placeHolder = "";
        this._placeHolderColor = "";
        this._mask = "";
        this._value = "";
        this._fontEntity = new exports_2.IgeFontEntity().left(5).middle(0).textAlignX(0).textAlignY(0).mount(this);
        const blurFunc = () => {
            var _a;
            if (this._domElement) {
                (_a = this._domElement.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this._domElement);
                delete this._domElement;
            }
        };
        const focusFunc = () => {
            exports_4.ige.input.stopPropagation();
            blurFunc();
            const entScreenPos = this.screenPosition();
            const input = document.createElement("input");
            input.setAttribute("type", "text");
            // Position the infobox and set content
            input.style.position = "absolute";
            input.style.top = entScreenPos.y - this._bounds2d.y2 + "px";
            input.style.left = entScreenPos.x - this._bounds2d.x2 + "px";
            input.style.width = this._bounds2d.x + "px";
            input.style.zIndex = "-1";
            input.style.opacity = "0";
            const body = document.getElementsByTagName("body")[0];
            body.appendChild(input);
            input.focus();
            // Now add the existing text to the box
            input.setAttribute("value", this._value);
            // Set the caret position
            input.selectionStart = this._value.length;
            input.selectionEnd = this._value.length;
            this._caretStart = this._value.length;
            this._caretEnd = this._value.length;
            // Listen for events from the temp input element
            input.addEventListener("keyup", (event) => {
                this.value(input.value);
                if (event.key === "Enter") {
                    // Enter pressed
                    this.emit("enter", this._value);
                }
            });
            input.addEventListener("keydown", (event) => {
                this.value(input.value);
            });
            input.addEventListener("mouseup", (event) => {
                this._caretStart = input.selectionStart;
                this._caretEnd = input.selectionEnd;
            });
            input.addEventListener("blur", (event) => {
                this.focus();
            });
            this._domElement = input;
        };
        // On focus, create a temp input element in the DOM and focus to it
        this.on("focus", focusFunc);
        this.on("pointerUp", focusFunc);
        this.on("pointerDown", () => {
            exports_4.ige.input.stopPropagation();
        });
        this.on("uiUpdate", () => {
            if (this._domElement) {
                // Update the transformation matrix
                this.updateTransform();
                const input = this._domElement, entScreenPos = this.screenPosition();
                // Reposition the dom element
                input.style.top = entScreenPos.y - this._bounds2d.y2 + "px";
                input.style.left = entScreenPos.x - this._bounds2d.x2 + "px";
            }
        });
        this.on("blur", blurFunc);
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
    placeHolder(val) {
        if (val !== undefined) {
            this._placeHolder = val;
            return this;
        }
        return this._placeHolder;
    }
    placeHolderColor(val) {
        if (val !== undefined) {
            this._placeHolderColor = val;
            return this;
        }
        return this._placeHolderColor;
    }
    mask(val) {
        if (val !== undefined) {
            this._mask = val;
            return this;
        }
        return this._mask;
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
            // Set the font sheet as the texture for our font entity
            this._fontEntity.texture(fontSheet);
            return this;
        }
        return this._fontSheet;
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
    color(color) {
        if (color !== undefined) {
            this._color = color;
            if (!this._value && this._placeHolder && this._placeHolderColor) {
                this._fontEntity.color(this._placeHolderColor);
            }
            else {
                this._fontEntity.color(color);
            }
            return this;
        }
        return this._color;
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
    destroy() {
        /* The 'blur' function is called to destroy the DOM textbox. */
        this.blur();
        return super.destroy();
    }
}
exports.IgeUiTextBox = IgeUiTextBox;
(0, exports_1.registerClass)(IgeUiTextBox);