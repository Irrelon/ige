"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiProgressBar = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
class IgeUiProgressBar extends exports_1.IgeUiElement {
    constructor() {
        super();
        this.classId = "IgeUiProgressBar";
        this.render = (ctx) => {
            // Check for an auto-progress update
            if (this._bindDataObject && this._bindDataProperty) {
                if (!this._bindDataObject._alive) {
                    // The object we have bind data from has been
                    // destroyed so release our reference to it!
                    delete this._bindDataObject;
                }
                else {
                    this.progress = parseInt(this._bindDataObject[this._bindDataProperty]);
                }
            }
            let progress = this._progress, valText;
            const min = this._min, max = this._max, interval = max - min !== 0 ? this._bounds2d.x / (max - min) : 0;
            // Check the value is not out of range
            if (progress > max) {
                progress = max;
            }
            if (progress < min) {
                progress = min;
            }
            const barWidth = (progress - min) * interval;
            // Draw bar fill
            if (this._barBackColor) {
                ctx.fillStyle = this._barBackColor;
                ctx.fillRect(-this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x, this._bounds2d.y);
            }
            // Draw bar
            if (this._barColor) {
                ctx.fillStyle = this._barColor;
                ctx.fillRect(-this._bounds2d.x2, -this._bounds2d.y2, barWidth, this._bounds2d.y);
            }
            // Draw bar border
            if (this._barBorderColor) {
                ctx.strokeStyle = this._barBorderColor;
                ctx.strokeRect(-this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x, this._bounds2d.y);
            }
            // Draw bar text centered
            if (this._barText) {
                if (this._barText.func) {
                    // Custom formatting function
                    valText = this._barText.func(progress, max);
                }
                else if (this._barText.pre || this._barText.post) {
                    if (this._barText.percent) {
                        valText = String(Math.floor((100 / max) * progress));
                    }
                    else {
                        valText = String(Math.floor(progress));
                    }
                }
            }
            if (valText) {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = this._barText.color;
                ctx.fillText(this._barText.pre + valText + this._barText.post, 0, 0);
            }
        };
        this._min = 0;
        this._max = 100;
        this._progress = 0;
        this._barColor = "#fff600";
        this._barText = {
            pre: "",
            post: "",
            color: ""
        };
    }
    get min() {
        return this._min;
    }
    set min(value) {
        this._min = value;
    }
    get max() {
        return this._max;
    }
    set max(value) {
        this._max = value;
    }
    get progress() {
        return this._progress;
    }
    set progress(value) {
        this._progress = Math.max(this._min, Math.min(this._max, value));
    }
    get barColor() {
        return this._barColor;
    }
    set barColor(value) {
        this._barColor = value;
    }
    get barText() {
        return this._barText;
    }
    set barText({ pre, post, color, percent, func }) {
        this._barText = { pre, post, color, percent: percent !== undefined ? percent : false, func };
    }
    get barBackColor() {
        return this._barBackColor;
    }
    set barBackColor(value) {
        this._barBackColor = value;
    }
    get barBorderColor() {
        return this._barBorderColor;
    }
    set barBorderColor(value) {
        this._barBorderColor = value;
    }
    set bindData({ obj, propName }) {
        this._bindDataObject = obj;
        this._bindDataProperty = propName;
    }
    tick(ctx) {
        this._transformContext(ctx);
        this.render(ctx);
        super.tick(ctx, true);
    }
}
exports.IgeUiProgressBar = IgeUiProgressBar;
(0, exports_2.registerClass)(IgeUiProgressBar);
