import { IgeFontEntity } from "@/engine/core/IgeFontEntity";
import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { registerClass } from "@/engine/igeClassStore";

export class IgeUiTogglePanel extends IgeUiElement {
	classId = "IgeUiTogglePanel";

	constructor (title, titleTexture, toggleOffTexture, toggleOnTexture) {
		super();

		this.backgroundColor("#222222");

		this._toggleState = false;
		this._toggleOffTexture = toggleOffTexture;
		this._toggleOnTexture = toggleOnTexture;

		this._panelImage = new IgeUiElement()
			.id("panelImage")
			.texture(toggleOffTexture)
			.left(5)
			.middle(0.5)
			.width(16)
			.height(16)
			.mount(this);

		this._panelTitle = new IgeFontEntity()
			.id("panelTitle")
			.texture(titleTexture)
			.left(25)
			.middle(0.5)
			.width("100%")
			.height(20)
			.textAlignX(0)
			.textAlignY(1)
			.text(title)
			.mount(this);

		this.pointerOver(function () {
			this.backgroundColor("#666666");
		});

		this.pointerOut(function () {
			this.backgroundColor("#222222");
		});

		this.pointerUp(function () {
			this._toggleState = !this._toggleState;

			if (this._toggleState) {
				this._panelImage.texture(this._toggleOnTexture);
				if (this._toggleOn) {
					this._toggleOn.apply(this);
				}
			} else {
				this._panelImage.texture(this._toggleOffTexture);
				if (this._toggleOff) {
					this._toggleOff.apply(this);
				}
			}
		});
	}

	toggleOn (method) {
		this._toggleOn = method;
		return this;
	}

	toggleOff (method) {
		this._toggleOff = method;
		return this;
	}
}

registerClass(IgeUiTogglePanel);
