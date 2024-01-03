import { IgeFontEntity } from "@/export/exports";
import { IgeUiElement } from "@/export/exports";
import { registerClass } from "@/export/exports";
import type { IgeTexture } from "@/export/exports";

export class IgeUiTogglePanel extends IgeUiElement {
	classId = "IgeUiTogglePanel";
	private _toggleState: boolean;
	private _toggleOffTexture: any;
	private _toggleOnTexture: any;
	private _panelImage: IgeUiElement;
	private _panelTitle: IgeFontEntity;
	private _toggleOn?: () => void;
	private _toggleOff?: () => void;

	constructor (title: string, titleTexture: IgeTexture, toggleOffTexture: IgeTexture, toggleOnTexture: IgeTexture) {
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
			} else {
				this._panelImage.texture(this._toggleOffTexture);
				if (this._toggleOff) {
					this._toggleOff.apply(this);
				}
			}
		});
	}

	toggleOn (method: () => void) {
		this._toggleOn = method;
		return this;
	}

	toggleOff (method: () => void) {
		this._toggleOff = method;
		return this;
	}
}

registerClass(IgeUiTogglePanel);
