import { IgeUiLabel } from "@/engine/ui/IgeUiLabel";
import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
import { Tab } from "./Tab";
import { ige } from "@/engine/instance";

export class InfoWindow extends IgeUiEntity {
	classId = "InfoWindow";
	_tab?: Tab;
	_label?: IgeUiLabel;
	_windowGradient?: CanvasGradient;

	constructor (options: Record<string, any>) {
		super();

		if (options.label) {
			this._label = new IgeUiLabel()
				.layer(1)
				.font(options.labelFont || "8px Verdana")
				.height(12)
				.width(100)
				.left(0)
				.top(5)
				.textAlignX(0)
				.textAlignY(1)
				.textLineSpacing(12)
				.color("#7bdaf1")
				.value(options.label)
				.mount(this);
		}

		if (options.tab) {
			// Create toggle tab for the window
			this._tab = new Tab(options.tab)
				.mount(this);
		}

		this.texture(ige.textures.get("infoWindow"));
		this.windowGradient("#04b7f9", "#005066", "#04b7f9");
	}

	show () {
		super.show();

		if (this._label) {
			this._label.width(this.width());
		}

		this.windowGradient("#04b7f9", "#005066", "#04b7f9");

		return this;
	}

	windowGradient (color1: string, color2: string, color3: string) {
		if (!ige.engine._ctx) return;

		const gradient = ige.engine._ctx.createLinearGradient(0, 0, this.width(), this.height());
		if (!gradient) return;

		this._windowGradient = gradient;
		this._windowGradient.addColorStop(0.0, color1);
		this._windowGradient.addColorStop(0.5, color2);
		this._windowGradient.addColorStop(1.0, color3);
	}
}
