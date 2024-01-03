"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiTogglePanel = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const exports_3 = require("../../export/exports.js");
class IgeUiTogglePanel extends exports_2.IgeUiElement {
    constructor(title, titleTexture, toggleOffTexture, toggleOnTexture) {
        super();
        this.classId = "IgeUiTogglePanel";
        this.backgroundColor("#222222");
        this._toggleState = false;
        this._toggleOffTexture = toggleOffTexture;
        this._toggleOnTexture = toggleOnTexture;
        this._panelImage = new exports_2.IgeUiElement().id("panelImage");
        this._panelImage.texture(toggleOffTexture);
        this._panelImage.left(5).middle(0.5).width(16).height(16).mount(this);
        this._panelTitle = new exports_1.IgeFontEntity().id("panelTitle");
        this._panelTitle
            .texture(titleTexture)
            .left(25)
            .middle(0.5)
            .width("100%")
            .height(20)
            .textAlignX(0)
            .textAlignY(1)
            .text(title);
        this._panelTitle.mount(this);
        this.pointerOver(() => {
            this.backgroundColor("#666666");
        });
        this.pointerOut(() => {
            this.backgroundColor("#222222");
        });
        this.pointerUp(() => {
            this._toggleState = !this._toggleState;
            if (this._toggleState) {
                this._panelImage.texture(this._toggleOnTexture);
                if (this._toggleOn) {
                    this._toggleOn.apply(this);
                }
            }
            else {
                this._panelImage.texture(this._toggleOffTexture);
                if (this._toggleOff) {
                    this._toggleOff.apply(this);
                }
            }
        });
    }
    toggleOn(method) {
        this._toggleOn = method;
        return this;
    }
    toggleOff(method) {
        this._toggleOff = method;
        return this;
    }
}
exports.IgeUiTogglePanel = IgeUiTogglePanel;
(0, exports_3.registerClass)(IgeUiTogglePanel);
