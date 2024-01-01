"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UiBuildItem = void 0;
const IgeUiElement_1 = require("@/engine/core/IgeUiElement");
const IgeUiLabel_1 = require("@/engine/ui/IgeUiLabel");
const IgeFontAlign_1 = require("@/enums/IgeFontAlign");
class UiBuildItem extends IgeUiElement_1.IgeUiElement {
    constructor(icon, label) {
        super();
        this.labelEntity = new IgeUiLabel_1.IgeUiLabel();
        this.labelEntity.paddingX(5);
        this.labelEntity.textAlignX(IgeFontAlign_1.IgeFontAlignX.left);
        this.labelEntity.textAlignY(IgeFontAlign_1.IgeFontAlignY.middle);
        this.labelEntity.color("#ffffff");
        this.labelEntity.backgroundColor("#333333");
        this.labelEntity.value(label);
        this.labelEntity.left(50);
        this.labelEntity.height(20);
        this.labelEntity.mount(this);
        this.labelEntity.hide();
        this.texture(icon);
        this.width(40);
        this.height(40);
        this.on("pointerOver", () => {
            this.labelEntity.show();
        });
        this.on("pointerOut", () => {
            this.labelEntity.hide();
        });
    }
}
exports.UiBuildItem = UiBuildItem;
