import type { IgeFontSheet } from "@/export/exports";
import type { IgeTexture } from "@/export/exports";
import { IgeUiElement } from "@/export/exports";
import { registerClass } from "@/export/exports";
import { IgeFontEntity } from "@/export/exports";
import { IgeFontAlignX, IgeFontAlignY } from "@/export/exports";
import type { IgeCanvasRenderingContext2d } from "@/export/exports";

/**
 * Provides a UI label entity. Basic on-screen text label.
 */
export class IgeUiLabel extends IgeUiElement {
	classId = "IgeUiLabel";

	_fontEntity: IgeFontEntity;
	_alignText?: "left" | "center" | "right";
	_placeHolder: string = "";
	_placeHolderColor: string = "";
	_mask: string = "";
	_fontSheet?: IgeFontSheet;
	_widthFromText: boolean = true;
	_valueChanged: boolean = true;

	constructor (label: string = "") {
		super();

		this._fontEntity = new IgeFontEntity()
			.left(0)
			.middle(0)
			.textAlignX(IgeFontAlignX.left)
			.textAlignY(IgeFontAlignY.middle)
			.textLineSpacing(10);

		this._fontEntity.mount(this);

		// Set defaults
		this.font("10px Verdana");
		this.allowActive(false);
		this.allowFocus(false);
		this.allowHover(false);

		if (label) {
			this.value(label);
		}
	}

	textAlignX(val: IgeFontAlignX): this;
	textAlignX(): IgeFontAlignX;
	textAlignX (val?: IgeFontAlignX) {
		if (val !== undefined) {
			this._fontEntity.textAlignX(val);
			return this;
		}

		return this._fontEntity.textAlignX();
	}

	textAlignY(val: IgeFontAlignY): this;
	textAlignY(): IgeFontAlignY;
	textAlignY (val?: IgeFontAlignY) {
		if (val !== undefined) {
			this._fontEntity.textAlignY(val);
			return this;
		}

		return this._fontEntity.textAlignY();
	}

	textLineSpacing(val: number): this;
	textLineSpacing(): number;
	textLineSpacing (val?: number) {
		if (val !== undefined) {
			this._fontEntity.textLineSpacing(val);
			return this;
		}

		return this._fontEntity.textLineSpacing();
	}

	autoWrap (val?: boolean) {
		if (val !== undefined) {
			return this._fontEntity.autoWrap(val);
		}

		return this._fontEntity.autoWrap();
	}

	/**
	 * Extended method to auto-update the width of the child
	 * font entity automatically to fill the text box.
	 * @param px
	 * @param lockAspect
	 * @param modifier
	 * @param noUpdate
	 * @return {*}
	 */
	width(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
	width(): number;
	width (px?: number | string, lockAspect = false, modifier?: number, noUpdate = false) {
		if (px !== undefined) {
			// Call the main super class method
			const returnValue = super.width(px, lockAspect, modifier, noUpdate);
			this._fontEntity.width(super.width(), lockAspect, modifier, noUpdate);

			return returnValue;
		}

		return this._fontEntity.width();
	}

	/**
	 * Extended method to auto-update the height of the child
	 * font entity automatically to fill the text box.
	 * @param px
	 * @param lockAspect
	 * @param modifier
	 * @param noUpdate
	 * @return {*}
	 */
	height(px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
	height(): number;
	height (px?: number | string, lockAspect: boolean = false, modifier?: number, noUpdate: boolean = false) {
		if (px !== undefined) {
			// Call the main super class method
			const returnValue = super.height(px, lockAspect, modifier, noUpdate);
			this._fontEntity.height(super.height(), lockAspect, modifier, noUpdate);

			return returnValue;
		}

		return this._fontEntity.height();
	}

	/**
	 * Gets / sets the text value of the label.
	 * @param {String=} val The text value.
	 * @return {*}
	 */
	value(val: string): this;
	value(): string;
	value (val?: string) {
		if (val === undefined) {
			return this._value;
		}

		if (this._value === val) {
			return this;
		}

		this._valueChanged = true;
		this._value = val;

		if (!val && this._placeHolder) {
			// Assign placeholder text and color
			this._fontEntity.text(this._placeHolder);
			this._fontEntity.color(this._placeHolderColor);
		} else {
			// Set the text of the font entity to the value
			if (!this._mask) {
				// Assign text directly
				this._fontEntity.text(this._value);
			} else {
				// Assign a mask value instead
				this._fontEntity.text(new Array(this._value.length + 1).join(this._mask));
			}
			this._fontEntity.color(this._color as string);
		}

		this.emit("change", this._value);
		return this;
	}

	/**
	 * Gets / sets the font sheet (texture) that the text box will
	 * use when rendering text inside the box.
	 * @param fontSheet
	 * @return {*}
	 */
	fontSheet (fontSheet?: IgeFontSheet) {
		if (fontSheet !== undefined) {
			this._fontSheet = fontSheet;

			// Set the font sheet as the texture for our font entity
			this._fontEntity.texture(fontSheet as unknown as IgeTexture);
			return this;
		}

		return this._fontSheet;
	}

	font(val: string | IgeFontSheet): this;
	font(): string | IgeFontSheet;
	font (val?: string | IgeFontSheet) {
		if (val !== undefined) {
			if (typeof val === "string") {
				// Native font name
				return this.nativeFont(val);
			} else {
				// Font sheet
				return this.fontSheet(val);
			}
		}

		if (this._fontEntity._nativeMode) {
			// Return native font
			return this.nativeFont();
		} else {
			// Return font sheet
			return this.fontSheet();
		}
	}

	nativeFont (val?: string) {
		if (val !== undefined) {
			this._fontEntity.nativeFont(val);
			return this;
		}

		return this._fontEntity.nativeFont();
	}

	nativeStroke (val?: number) {
		if (val !== undefined) {
			this._fontEntity.nativeStroke(val);
			return this;
		}

		return this._fontEntity.nativeStroke();
	}

	nativeStrokeColor (val?: string) {
		if (val !== undefined) {
			this._fontEntity.nativeStrokeColor(val);
			return this;
		}

		return this._fontEntity.nativeStrokeColor();
	}

	color(val: string): this;
	color(): string;
	color (val?: string) {
		if (val !== undefined) {
			this._color = val;

			if (!this._value && this._placeHolder && this._placeHolderColor) {
				this._fontEntity.color(this._placeHolderColor);
			} else {
				this._fontEntity.color(val);
			}
			return this;
		}

		return this._color;
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		if (this._widthFromText && this._valueChanged !== this._value) {
			this._valueChanged = false;
			this.width(this._fontEntity.measureTextWidth(this._value) + this._paddingLeft + this._paddingRight);
		}

		super.update(ctx, tickDelta);
	}

	_mounted () {
		// Check if we have a text value
		if (!this._value && this._placeHolder) {
			// Assign placeholder text and color
			this._fontEntity.text(this._placeHolder);
			this._fontEntity.color(this._placeHolderColor);
		}

		super._mounted();
	}
}

registerClass(IgeUiLabel);
