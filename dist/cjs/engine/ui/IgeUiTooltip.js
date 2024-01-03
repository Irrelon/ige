"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiTooltip = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const exports_3 = require("../../export/exports.js");
/**
 * Provides a UI tooltip. Change properties (textBox, fonts, backgroundcolor)
 * at free will.
 */
class IgeUiTooltip extends exports_2.IgeUiElement {
    /**
     * @constructor
     * @param parent Where the mousemove is captured i.e. on which element the tooltip should appear
     * @param mountEntity Where the tooltip should be mounted. A scene is suggested.
     * @param width Width of the tooltip
     * @param height Height of the tooltip
     * @param content The content which is set with public method "setContent". Can be string, array(2) or an entity
     */
    constructor(parent, mountEntity, width, height, content) {
        super();
        this.classId = "IgeUiTooltip";
        /**
         * Handles mousemove event to show the textbox and adjust its
         * position according to the mouse position
         * @param event
         * @private
         */
        this._mousemove = (event) => {
            if (this._hidden) {
                this.show();
            }
            const mountPos = this._mountEntity.worldPosition();
            this.translateTo(event.igeX - mountPos.x + this._bounds2d.x2 + 10, event.igeY - mountPos.y + this._bounds2d.y2, 0);
            this.updateUiChildren();
        };
        /**
         * Handles mouseout event to hide the tooltip
         * @param event
         * @private
         */
        this._mouseout = (event) => {
            this.hide();
        };
        this.titleBox = new exports_2.IgeUiElement().left(0).top(0).width(width).height(30).mount(this);
        this.titleBox.borderBottomColor("#ffffff");
        this.titleBox.borderBottomWidth(1);
        this.textBox = new exports_2.IgeUiElement()
            .left(0)
            .top(30)
            .width(width)
            .height(height - 30)
            .mount(this);
        this.fontEntityTitle = new exports_1.IgeFontEntity();
        this.fontEntityTitle.left(5).top(-4).textAlignX(0).textAlignY(0).nativeFont("10pt Arial");
        this.fontEntityTitle.textLineSpacing(-5).mount(this.titleBox);
        this.fontEntityText = new exports_1.IgeFontEntity();
        this.fontEntityText.left(5).top(0).textAlignX(0).textAlignY(0).nativeFont("10pt Arial");
        this.fontEntityText.textLineSpacing(-5).mount(this.textBox);
        this.setContent(content);
        this.hide();
        this._mountEntity = mountEntity;
        this.mount(mountEntity);
        this.backgroundColor("#53B2F3");
        this.depth(10000);
        this.translateTo(parent._translate.x, parent._translate.y, parent._translate.z);
        this.width(width);
        this.height(height);
        // @ts-ignore
        parent._tooltip = this;
        // Listen for keyboard events to capture text input
        parent._pointerEventsActive = true;
        parent.on("pointerMove", this._mousemove);
        parent.on("pointerOut", this._mouseout);
        return this;
    }
    width(px, lockAspect = false, modifier, noUpdate = false) {
        let val;
        if (px !== undefined) {
            // Call the main super class method
            val = super.width(px, lockAspect, modifier, noUpdate);
            // Update the font entity width
            this.fontEntityTitle.width(px, lockAspect, modifier, noUpdate);
            this.fontEntityText.width(px, lockAspect, modifier, noUpdate);
        }
        else {
            val = super.width();
        }
        return val;
    }
    height(px, lockAspect = false, modifier, noUpdate = false) {
        let val;
        if (px !== undefined) {
            // Call the main super class method
            val = super.height(px, lockAspect, modifier, noUpdate);
            // Update the font entity height
            this.fontEntityTitle.width(px, lockAspect, modifier, noUpdate);
            this.fontEntityText.width(px, lockAspect, modifier, noUpdate);
        }
        else {
            val = super.height();
        }
        return val;
    }
    /**
     * Sets the content of the tooltip. Can be a string for
     * simple text, an array with two strings for text and title
     * or a whole entity
     * @param val The content, be it string, array(2) or an entity
     * @return {*}
     */
    setContent(val) {
        if (val === undefined) {
            return this;
        }
        this.titleBox.unMount();
        this.textBox.unMount();
        this._children.forEach((child) => {
            child.unMount();
            child.destroy();
        });
        if (typeof val == "string") {
            this.textBox.mount(this);
            this.textBox.height(this._bounds2d.y);
            this.textBox.top(0);
            // Set the text of the font entity to the value
            this.fontEntityText.text(this._value);
        }
        else if (typeof val === "object" && typeof (val[0] === "string") && typeof (val[1] === "string")) {
            this.titleBox.mount(this);
            this.textBox.mount(this);
            this.textBox.height(this._bounds2d.y - this.titleBox._bounds2d.y);
            this.textBox.top(this.titleBox._bounds2d.y);
            //title + text
            this.fontEntityTitle.text(val[0]);
            this.fontEntityText.text(val[1]);
        }
        else if (typeof val === "object") {
            val.mount(this);
        }
        this.updateUiChildren();
    }
    /**
     * Gets / sets the font sheet (texture) that the text box will
     * use when rendering text inside the box.
     * @param fontSheet
     * @return {*}
     */
    fontSheet(fontSheet) {
        if (fontSheet === undefined) {
            return this;
        }
        // Set the font sheet as the texture for our font entity
        this.fontEntityTitle.texture(fontSheet);
        this.fontEntityText.texture(fontSheet);
    }
}
exports.IgeUiTooltip = IgeUiTooltip;
(0, exports_3.registerClass)(IgeUiTooltip);
