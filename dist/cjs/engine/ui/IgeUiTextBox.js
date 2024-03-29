"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiTextBox = void 0;
const IgeFontEntity_1 = require("../core/IgeFontEntity.js");
const IgeUiElement_1 = require("../core/IgeUiElement.js");
const instance_1 = require("../instance.js");
const igeClassStore_1 = require("../utils/igeClassStore.js");
const enums_1 = require("../../enums/index.js");
/**
 * Provides a UI text entry box. When provided with focus this UI entity will
 * capture keyboard input and display it, similar in usage to the HTML input
 * text element. Font defaults to aligning h-left and v-middle. You can change
 * this by accessing the textBox._fontEntity.textAlignY(IgeFontAlignY).
 */
// TODO: Make mouse pointer a text entry cursor on hover
// TODO: Make a flashing cursor
class IgeUiTextBox extends IgeUiElement_1.IgeUiElement {
    constructor() {
        super();
        this.classId = "IgeUiTextBox";
        this._caretStart = 0;
        this._caretEnd = 0;
        this._placeHolder = "";
        this._placeHolderColor = "";
        this._mask = "";
        this._value = "";
        this._fontEntity = new IgeFontEntity_1.IgeFontEntity();
        this._fontEntity.left(5).middle(0).textAlignX(0).textAlignY(enums_1.IgeFontAlignY.multiLineMiddle).mount(this);
        const blurFunc = () => {
            var _a;
            if (this._domElement) {
                (_a = this._domElement.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this._domElement);
                delete this._domElement;
            }
        };
        const focusFunc = () => {
            instance_1.ige.input.stopPropagation();
            // First call blur to remove any previous background DOM element
            blurFunc();
            // Now we grab the screen position of the IGE element, so we
            // can position a DOM element over it
            const entScreenPos = this.screenPosition();
            // We create this DOM element ONLY because, on tablets and phones the browser
            // will not display the on-screen keyboard to allow text entry unless a
            // DOM element exists to type into
            const input = document.createElement("input");
            input.setAttribute("type", "text");
            // Position the DOM input element and set content
            input.style.position = "absolute";
            input.style.top = entScreenPos.y - this._bounds2d.y2 + "px";
            input.style.left = entScreenPos.x - this._bounds2d.x2 + "px";
            input.style.width = this._bounds2d.x + "px";
            input.style.height = this._bounds2d.y + "px";
            input.style.zIndex = "-1";
            input.style.opacity = "0";
            const body = document.getElementsByTagName("body")[0];
            body.appendChild(input);
            // Place browser focus on the DOM input element
            input.focus();
            // Now add the existing text to the DOM input element
            input.setAttribute("value", this._value);
            // Set the caret position to the end of the current value
            // so when the user types, text is appended to the end of
            // the existing value
            input.selectionStart = this._value.length;
            input.selectionEnd = this._value.length;
            this._caretStart = this._value.length;
            this._caretEnd = this._value.length;
            // Listen for events from the temp input element
            input.addEventListener("input", (event) => {
                this.value(input.value);
            });
            input.addEventListener("keyup", (event) => {
                if (event.key === "Enter") {
                    // Enter pressed
                    this.emit("enter", this._value);
                }
            });
            input.addEventListener("mouseup", (event) => {
                // Sync our internal caret position with the DOM element
                this._caretStart = input.selectionStart;
                this._caretEnd = input.selectionEnd;
            });
            // Not sure what to do here or if we need to. Blurring after instantiation is the issue
            // and only seems to occur on desktop, where an onscreen keyboard is not required anyway
            //input.addEventListener("blur", (event) => {
            //	console.log("Internal dom element lost focus");
            //	this.focus();
            //});
            this._domElement = input;
        };
        // On focus, create a temp input element in the DOM and focus to it
        this.on("focus", focusFunc);
        this.on("pointerUp", focusFunc);
        this.on("pointerDown", () => {
            instance_1.ige.input.stopPropagation();
        });
        // Hook the uiUpdate event (emitted by the underlying IgeUiEntity) that
        // gets emitted when any updates have occurred to the ui styling of
        // the element / entity
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
            this._resolveTextColor();
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
            this._resolveTextColor();
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
    _resolveTextColor() {
        // Check if the textbox has a text value, if so we want
        // to render the text in the color defined in this._color.
        if (this._value) {
            if (this._color) {
                this._fontEntity.color(this._color);
            }
            return;
        }
        // There is no current textbox text value so set the color
        // to the placeholder color if there is one
        if (this._placeHolderColor && this._placeHolder) {
            this._fontEntity.color(this._placeHolderColor);
            return;
        }
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
(0, igeClassStore_1.registerClass)(IgeUiTextBox);
