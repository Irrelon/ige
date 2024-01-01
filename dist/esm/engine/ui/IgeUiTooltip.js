import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { IgeFontEntity } from "@/engine/core/IgeFontEntity";
import { registerClass } from "@/engine/igeClassStore";
/**
 * Provides a UI tooltip. Change properties (textBox, fonts, backgroundcolor)
 * at free will.
 */
export class IgeUiTooltip extends IgeUiElement {
    classId = "IgeUiTooltip";
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
        const self = this;
        this.titleBox = new IgeUiElement()
            .left(0)
            .top(0)
            .width(width)
            .height(30)
            .mount(this);
        this.titleBox.borderBottomColor("#ffffff");
        this.titleBox.borderBottomWidth(1);
        this.textBox = new IgeUiElement()
            .left(0)
            .top(30)
            .width(width)
            .height(height - 30)
            .mount(this);
        this.fontEntityTitle = new IgeFontEntity()
            .left(5)
            .top(-4)
            .textAlignX(0)
            .textAlignY(0)
            .nativeFont("10pt Arial")
            .textLineSpacing(-5)
            .mount(this.titleBox);
        this.fontEntityText = new IgeFontEntity()
            .left(5)
            .top(0)
            .textAlignX(0)
            .textAlignY(0)
            .nativeFont("10pt Arial")
            .textLineSpacing(-5)
            .mount(this.textBox);
        this.setContent(content);
        this.hide();
        this._mountEntity = mountEntity;
        this.mount(mountEntity);
        this.backgroundColor("#53B2F3");
        this.depth(10000);
        this.translateTo(parent._translate.x, parent._translate.y, parent._translate.z);
        this.width(width);
        this.height(height);
        parent._tooltip = this;
        // Listen for keyboard events to capture text input
        parent._pointerEventsActive = true;
        parent.on("pointerMove", this._mousemove);
        parent.on("pointerOut", this._mouseout);
        return this;
    }
    /**
     * Extended method to auto-update the width of the child
     * font entity automatically to fill the text box.
     * @param px
     * @param lockAspect
     * @param modifier
     * @param noUpdate
     * @return {*}
     */
    width(px, lockAspect, modifier, noUpdate) {
        let val;
        // Call the main super class method
        val = super.width(px, lockAspect, modifier, noUpdate);
        // Update the font entity width
        this.fontEntityTitle.width(px, lockAspect, modifier, noUpdate);
        this.fontEntityText.width(px, lockAspect, modifier, noUpdate);
        return val;
    }
    /**
     * Extended method to auto-update the height of the child
     * font entity automatically to fill the text box.
     * @param px
     * @param lockAspect
     * @param modifier
     * @param noUpdate
     * @return {*}
     */
    height(px, lockAspect, modifier, noUpdate) {
        let val;
        // Call the main super class method
        val = super.height(px, lockAspect, modifier, noUpdate);
        // Update the font entity height
        this.fontEntityTitle.width(px, lockAspect, modifier, noUpdate);
        this.fontEntityText.width(px, lockAspect, modifier, noUpdate);
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
        if (typeof (val) == "string") {
            this.textBox.mount(this);
            this.textBox.height(this._bounds2d.y);
            this.textBox.top(0);
            // Set the text of the font entity to the value
            this.fontEntityText.text(this._value);
        }
        else if (typeof (val) == "object" && typeof (val[0] === "string") && typeof (val[1] === "string")) {
            this.titleBox.mount(this);
            this.textBox.mount(this);
            this.textBox.height(this._bounds2d.y - this.titleBox._bounds2d.y);
            this.textBox.top(this.titleBox._bounds2d.y);
            //title + text
            this.fontEntityTitle.text(val[0]);
            this.fontEntityText.text(val[1]);
        }
        else if (typeof (val) == "object") {
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
    /**
     * Handles mousemove event to show the textbox and adjust its
     * position according to the mouse position
     * @param event
     * @private
     */
    _mousemove(event) {
        let toolTip = this._tooltip, mountPos;
        if (toolTip._hidden) {
            toolTip.show();
        }
        mountPos = toolTip._mountEntity.worldPosition();
        toolTip.translateTo(event.igeX - mountPos.x + toolTip._bounds2d.x2 + 10, event.igeY - mountPos.y + toolTip._bounds2d.y2, 0);
        toolTip.updateUiChildren();
    }
    /**
     * Handles mouseout event to hide the tooltip
     * @param event
     * @private
     */
    _mouseout(event) {
        this._tooltip.hide();
    }
}
registerClass(IgeUiTooltip);
