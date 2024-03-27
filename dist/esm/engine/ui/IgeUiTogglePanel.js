import { IgeFontEntity } from "../core/IgeFontEntity.js"
import { IgeUiElement } from "../core/IgeUiElement.js";
import { registerClass } from "../utils/igeClassStore.js"
export class IgeUiTogglePanel extends IgeUiElement {
    classId = "IgeUiTogglePanel";
    _toggleState;
    _toggleOffTexture;
    _toggleOnTexture;
    _panelImage;
    _panelTitle;
    _toggleOn;
    _toggleOff;
    constructor(title, titleTexture, toggleOffTexture, toggleOnTexture) {
        super();
        this.backgroundColor("#222222");
        this._toggleState = false;
        this._toggleOffTexture = toggleOffTexture;
        this._toggleOnTexture = toggleOnTexture;
        this._panelImage = new IgeUiElement().id("panelImage");
        this._panelImage.texture(toggleOffTexture);
        this._panelImage.left(5).middle(0.5).width(16).height(16).mount(this);
        this._panelTitle = new IgeFontEntity().id("panelTitle");
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
registerClass(IgeUiTogglePanel);
