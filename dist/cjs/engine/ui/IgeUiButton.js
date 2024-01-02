"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiButton = void 0;
const IgeUiElement_1 = require("../core/IgeUiElement.js");
const igeClassStore_1 = require("../igeClassStore.js");
class IgeUiButton extends IgeUiElement_1.IgeUiElement {
    constructor() {
        super();
        this.classId = "IgeUiButton";
        this._autoCell = false;
        this.on("pointerDown", () => {
            if (this._autoCell && this._cell !== null) {
                // React to the mouse events
                this.cell(this._cell + 1);
                this.cacheDirty(true);
            }
        });
        this.on("pointerUp", () => {
            if (this._autoCell && this._cell !== null) {
                // React to the mouse events
                this.cell(this._cell - 1);
                this.cacheDirty(true);
            }
        });
    }
    /**
     * Gets / sets the auto cell flag. If true the button will automatically
     * react to being clicked on and update the texture cell to +1 when mousedown
     * and -1 when mouseup allowing you to define cell sheets of button graphics
     * with the up-state on cell 1 and the down-state on cell 2.
     * @param {Boolean=} val Either true or false.
     * @returns {*}
     */
    autoCell(val) {
        if (val !== undefined) {
            this._autoCell = val;
            if (val) {
                this.pointerEventsActive(true);
            }
            return this;
        }
        return this._autoCell;
    }
    /**
     * Fires a mouse-down and a mouse-up event for the entity.
     * @returns {*}
     */
    click() {
        if (this._pointerDown) {
            this._pointerDown();
        }
        if (this._pointerUp) {
            this._pointerUp();
        }
        return this;
    }
    tick(ctx) {
        super.tick(ctx);
        // Now draw any ui overlays
        // Check for the old way to assign text to the button
        const uiData = this.data("ui");
        if (uiData) {
            // Draw text
            if (uiData.text) {
                ctx.font = uiData.text.font || "normal 12px Verdana";
                ctx.textAlign = uiData.text.align || "center";
                ctx.textBaseline = uiData.text.baseline || "middle";
                ctx.fillStyle = uiData.text.color || "#ffffff";
                ctx.fillText(uiData.text.value, 0, 0);
            }
        }
        // Check for the new way to assign text to the button
        if (this._value) {
            // Draw text
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = this._color;
            ctx.fillText(this._value, 0, 0);
        }
    }
}
exports.IgeUiButton = IgeUiButton;
(0, igeClassStore_1.registerClass)(IgeUiButton);
