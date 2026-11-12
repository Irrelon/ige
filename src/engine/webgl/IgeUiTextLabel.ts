import { IgeEntity } from "@/engine/core/IgeEntity";
import { igeTextTexture, type IgeTextStyle, type IgeTextTexture, releaseTextTexture } from "@/engine/webgl/igeTextTexture";

export interface IgeUiTextLabelOptions {
	text?: string;
	style?: IgeTextStyle;
	/** Its height (world units for one anchored in the world, pixels on the screen; default its texture's height in pixels). Its width follows the words. */
	height?: number;
	/** Its UI layer (default 0); `false` to take its UI settings from an IgeUiLayer it's mounted under (or to draw it in the scene). */
	layer?: number | false;
}

/**
 * Words on a plate, in the WebGL renderer's UI layer (see
 * IgeEntity.uiLayer() and guides/ui-layer.md): over everything, facing the
 * camera. The texture comes from igeTextTexture(), so labels with the same
 * words and style share one, and it's let go when the label is destroyed or
 * its words change. Its width keeps the words' aspect.
 * @example #A label over a terminal, 24 pixels tall at any zoom
 *     new IgeUiTextLabel({ text: "MARKET", style: { background: "rgba(4,14,24,0.55)", bar: { color: "#ffb347", width: 6 } } })
 *         .uiScreenSize(24)
 *         .translateTo(x, 96, z)
 *         .mount(scene);
 */
export class IgeUiTextLabel extends IgeEntity {
	classId = "IgeUiTextLabel";
	_labelText = "";
	_labelStyle: IgeTextStyle = {};
	_labelHeight?: number;
	_labelTexture?: IgeTextTexture;

	constructor (options: IgeUiTextLabelOptions = {}) {
		super();
		this._labelStyle = options.style ?? {};
		this._labelHeight = options.height;
		if (options.layer !== false) this.uiLayer(options.layer ?? 0);
		this.text(options.text ?? "");
	}

	/** Gets / sets its words. */
	text (): string;
	text (value: string): this;
	text (value?: string) {
		if (value === undefined) return this._labelText;
		if (value === this._labelText && this._labelTexture) return this;
		this._labelText = value;
		this._redraw();
		return this;
	}

	/** Gets / sets how it looks. */
	labelStyle (): IgeTextStyle;
	labelStyle (style: IgeTextStyle): this;
	labelStyle (style?: IgeTextStyle) {
		if (style === undefined) return this._labelStyle;
		this._labelStyle = style;
		this._redraw();
		return this;
	}

	/** Gets / sets its height (its width follows the words). */
	labelHeight (): number;
	labelHeight (height: number): this;
	labelHeight (height?: number) {
		if (height === undefined) return this._labelHeight ?? this._labelTexture?.height ?? 0;
		this._labelHeight = height;
		this._size();
		return this;
	}

	destroy (): this {
		releaseTextTexture(this._labelTexture);
		this._labelTexture = undefined;
		return super.destroy();
	}

	_redraw (): void {
		const before = this._labelTexture;
		this._labelTexture = this._labelText ? igeTextTexture(this._labelText, this._labelStyle) : undefined;
		releaseTextTexture(before);
		if (this._labelTexture) this.texture(this._labelTexture.texture);
		else this._texture = undefined;
		this._size();
	}

	_size (): void {
		const t = this._labelTexture;
		if (!t) return;
		const h = this._labelHeight ?? t.height;
		this.height(h).width(h * t.aspect);
	}
}
