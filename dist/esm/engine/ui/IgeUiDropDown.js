import { ige } from "../instance.js"
import { IgeUiElement } from "../core/IgeUiElement.js"
import { IgeUiLabel } from "./IgeUiLabel.js"
import { registerClass } from "../igeClassStore.js"
export class IgeUiDropDown extends IgeUiElement {
    classId = "IgeUiDropDown";
    _toggleState = false;
    _options = [];
    _label;
    constructor() {
        super();
        // Define some default styles
        if (!ige.ui.style(".IgeUiDropDownOption")) {
            ige.ui.style(".IgeUiDropDownOption", {
                backgroundColor: null
            });
            ige.ui.style(".IgeUiDropDownOption:hover", {
                backgroundColor: "#00b4ff",
                color: "#ffffff"
            });
        }
        // Set defaults
        this.borderColor("#000000");
        this.borderWidth(1);
        this.backgroundColor("#ffffff");
        this.color("#000000");
        this.width(200);
        this.height(30);
        this._label = new IgeUiLabel()
            .left(0)
            .right(30)
            .top(0)
            .bottom(0)
            .textAlignY(1)
            .mount(this);
        this.on("pointerUp", () => {
            // Toggle the list drop-down
            this.toggle();
        });
    }
    options(ops) {
        if (ops !== undefined) {
            this._options = ops;
            // Loop the options and check for a selected one
            let arrCount = ops.length;
            while (arrCount--) {
                if (ops[arrCount].selected) {
                    // Set this option as selected
                    this.selectIndex(arrCount);
                    return this;
                }
            }
            // No item selected, select the first option
            this.selectIndex(0);
            return this;
        }
        return this;
    }
    addOption(op) {
        if (op !== undefined) {
            this._options.push(op);
            if (op.selected) {
                // Set this option as selected
                this.selectIndex(this._options.length - 1);
                return this;
            }
            // No item selected, select the first option
            this.selectIndex(0);
            return this;
        }
        return this;
    }
    removeAllOptions() {
        this._options = [];
        this.value({
            text: "",
            value: ""
        });
    }
    /**
     * The blur method removes global UI focus from this UI element.
     */
    blur() {
        const returnValue = super.blur();
        if (this._toggleState) {
            this.toggle();
        }
        return returnValue;
    }
    selectIndex(index) {
        if (this._options[index]) {
            this.value(this._options[index]);
            this.emit("change", this.value());
        }
    }
    value(val) {
        if (val !== undefined) {
            super.value(val);
            this._label.value(val.text);
            return this;
        }
        return this._value.value;
    }
    toggle() {
        this._toggleState = !this._toggleState;
        if (this._toggleState) {
            const mainTop = this._bounds2d.y + 5;
            const mainHeight = this._options.length * 30;
            const optionContainer = new IgeUiElement()
                .id(this._id + "_options")
                .backgroundColor(this._backgroundColor)
                .borderColor(this._borderColor)
                .borderWidth(this._borderWidth)
                .top(mainTop)
                .width(this._bounds2d.x)
                .height(mainHeight)
                .mount(this);
            for (let i = 0; i < this._options.length; i++) {
                ige.ui.style("#" + this._id + "_options_" + i, {
                    color: this._color
                });
                new IgeUiLabel()
                    .id(`${this._id}_options_${i}`)
                    .data("optionIndex", i)
                    .styleClass("IgeUiDropDownOption")
                    .value(this._options[i].text)
                    .top((this._bounds2d.y * i) + 1)
                    .left(1)
                    .width(this._bounds2d.x - 2)
                    .height(this._bounds2d.y - 2)
                    .textAlignY(1)
                    .allowFocus(true)
                    .allowActive(true)
                    .allowHover(true)
                    .pointerUp(() => {
                    this.selectIndex(this.data("optionIndex"));
                })
                    .mount(optionContainer);
            }
        }
        else {
            ige.$(`${this._id}_options`)?.destroy();
        }
    }
    tick(ctx) {
        super.tick(ctx);
        // Draw drop-down box
        ctx.fillStyle = "#cccccc";
        ctx.fillRect(Math.floor(this._bounds2d.x2) - 30, -this._bounds2d.y2 + 1, 30, this._bounds2d.y - 2);
        // Chevron
        ctx.strokeStyle = this._color;
        ctx.beginPath();
        ctx.moveTo(this._bounds2d.x2 - 18.5, -this._bounds2d.y2 + 14.5);
        ctx.lineTo(this._bounds2d.x2 - 14.5, 2.5);
        ctx.lineTo(this._bounds2d.x2 - 10.5, -this._bounds2d.y2 + 14.5);
        ctx.stroke();
        this._renderBorder(ctx);
    }
}
registerClass(IgeUiDropDown);
