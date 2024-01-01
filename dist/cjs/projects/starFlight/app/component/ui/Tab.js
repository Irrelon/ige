"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tab = void 0;
const IgeUiLabel_1 = require("@/engine/ui/IgeUiLabel");
const IgeUiEntity_1 = require("@/engine/core/IgeUiEntity");
const instance_1 = require("@/engine/instance");
const IgeTween_1 = require("@/engine/core/IgeTween");
class Tab extends IgeUiEntity_1.IgeUiEntity {
    constructor(options) {
        super();
        this.classId = "Tab";
        this._slideVal = 0;
        this._tabOptions = {};
        this._tabOptions = options;
        this.width(options.width);
        this.height(20);
        // Set position of this tab from parent
        switch (options.position) {
            case "top":
                this.top(-this.height());
                this.left(10);
                break;
            case "bottom":
                this.bottom(-this.height());
                this.left(10);
                break;
            case "left":
                break;
            case "right":
                break;
            default:
                throw ("Unsupported tab position: " + options.position);
        }
        this._label = new IgeUiLabel_1.IgeUiLabel()
            .layer(1)
            .font(options.labelFont || "8px Verdana")
            .height(12)
            .width(80)
            .left(5)
            .top(4)
            .textAlignX(0)
            .textAlignY(1)
            .textLineSpacing(12)
            .color("#7bdaf1")
            .value(options.label)
            .mount(this);
        this.texture(instance_1.ige.textures.get("tab"));
        // Setup click handler to slide the parent in and out
        this.pointerUp(() => {
            let currentPos, currentVal, targetVal;
            const parent = this.parent();
            if (!parent)
                return;
            switch (options.position) {
                case "top":
                    currentPos = this.bottom();
                    if (currentPos > 0) {
                        // Slide down
                        targetVal = -this.height();
                    }
                    else {
                        // Slide up
                        targetVal = options.tweenDefault;
                    }
                    this._slideVal = currentPos;
                    new IgeTween_1.IgeTween(this, {
                        _slideVal: targetVal
                    }, 200).afterChange(() => {
                        this.bottom(this._slideVal);
                    }).start();
                    break;
                case "bottom":
                    currentPos = this.top();
                    if (currentPos > 0) {
                        // Slide up
                        targetVal = -this.height();
                    }
                    else {
                        // Slide down
                        targetVal = options.tweenDefault;
                    }
                    this._slideVal = currentPos;
                    new IgeTween_1.IgeTween(this, {
                        _slideVal: targetVal
                    }, 200).afterChange(() => {
                        this.top(this._slideVal);
                    }).start();
                    break;
                case "left":
                    break;
                case "right":
                    break;
                default:
                    throw ("Unsupported tab position: " + options.position);
            }
        });
    }
}
exports.Tab = Tab;
