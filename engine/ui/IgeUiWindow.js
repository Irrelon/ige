import { ige } from "../instance.js";
import { IgeUiElement } from "../core/IgeUiElement.js";
import { IgeUiLabel } from "../../engine/ui/IgeUiLabel.js";
import { IgeUiButton } from "../../engine/ui/IgeUiButton.js";
import { registerClass } from "../../engine/igeClassStore.js";
export class IgeUiWindow extends IgeUiElement {
    constructor() {
        super();
        this.classId = "IgeUiWindow";
        this._draggable = false;
        this._dragging = false;
        this._opStartTranslate = {};
        this._eventHandlers = {};
        const ui = ige.ui;
        // Define some default styles
        if (!ui.style("IgeUiWindow")) {
            ui.style("IgeUiWindow", {
                backgroundColor: null
            });
        }
        // Set defaults
        this.borderColor("#000000");
        this.borderWidth(1);
        this.backgroundColor("#ffffff");
        this.color("#000000");
        this.width(200);
        this.height(30);
        this._topNav = new IgeUiElement()
            .backgroundColor("#212121")
            .top(0)
            .left(0)
            .right(0)
            .height(42)
            .mount(this);
        this._label = new IgeUiLabel()
            .left(0)
            .top(0)
            .right(0)
            .bottom(0)
            .paddingLeft(5)
            .textAlignY(1)
            .mount(this._topNav);
        this._label.color("#ffffff")
            .value("Window Title");
        this._closeButton = new IgeUiButton()
            .backgroundColor("#cccccc")
            .borderColor("#000000")
            .borderWidth(1)
            .width(26)
            .height(26)
            .right(8)
            .top(8)
            .value("X")
            .color("#000000")
            .pointerUp(() => {
            if (!this.emit("beforeClose")) {
                this.destroy();
            }
            ige.input.stopPropagation();
        })
            .mount(this._topNav);
    }
    _dragStart() {
        if (!this._draggable) {
            return;
        }
        this._dragging = true;
        this._opStartMouse = ige.engine._pointerPos.clone();
        this._opStartTranslate = {
            x: this._translate.x,
            y: this._translate.y
        };
        return true;
    }
    _dragMove() {
        if (!this._draggable || !this._dragging)
            return;
        if (!ige.engine._currentViewport)
            return;
        if (!this._opStartMouse)
            return;
        // Update window co-ordinates
        const curMousePos = ige.engine._pointerPos;
        const panCordsX = this._opStartMouse.x - curMousePos.x;
        const panCordsY = this._opStartMouse.y - curMousePos.y;
        const panFinalX = this._opStartTranslate.x - (panCordsX / ige.engine._currentViewport.camera._scale.x);
        const panFinalY = this._opStartTranslate.y - (panCordsY / ige.engine._currentViewport.camera._scale.y);
        this.style("left", panFinalX);
        this.style("top", panFinalY);
        // Cancel further propagation
        return true;
    }
    _dragEnd() {
        if (this._draggable && this._dragging) {
            this._dragging = false;
            // Cancel further propagation
            return true;
        }
    }
    draggable(val) {
        if (val) {
            this._draggable = true;
            this._eventHandlers.pointerDown = this._topNav.on("pointerDown", this._dragStart);
            this._eventHandlers.preMouseUp = ige.input.on("preMouseUp", this._dragEnd);
            this._eventHandlers.preMouseMove = ige.input.on("preMouseMove", this._dragMove);
        }
        else {
            this._draggable = false;
            this._topNav.off("pointerDown", this._eventHandlers.pointerDown);
            ige.input.off("preMouseUp", this._eventHandlers.preMouseUp);
            ige.input.off("preMouseMove", this._eventHandlers.preMouseMove);
        }
    }
    blur() {
        return super.blur();
    }
    title(val) {
        if (val !== undefined) {
            this._label.value(val);
            return this;
        }
        return this._label.value();
    }
    titleColor(val) {
        if (val !== undefined) {
            this._label.color(val);
            return this;
        }
        return this._label.color();
    }
    titleFont(val) {
        if (val !== undefined) {
            this._label.style("font", val);
            return this;
        }
        return this._label.style("font");
    }
}
registerClass(IgeUiWindow);
