import { IgeUiElement } from "../../../../engine/core/IgeUiElement.js";
import { IgeUiLabel } from "../../../../engine/ui/IgeUiLabel.js";
import { IgeFontAlignX, IgeFontAlignY } from "../../../../enums/IgeFontAlign.js";
export class UiBuildItem extends IgeUiElement {
    constructor(icon, label) {
        super();
        this.labelEntity = new IgeUiLabel();
        this.labelEntity.paddingX(5);
        this.labelEntity.textAlignX(IgeFontAlignX.left);
        this.labelEntity.textAlignY(IgeFontAlignY.middle);
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
