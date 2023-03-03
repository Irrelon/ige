/**
 * Provides a UI label entity. Basic on-screen text label.
 */
import IgeUiElement from "../core/IgeUiElement";
import IgeFontEntity from "../core/IgeFontEntity";

class IgeUiLabel extends IgeUiElement {
	classId = "IgeUiLabel";

	/**
	 * @constructor
	 */
	constructor (ige, options = {}) {
		super(ige);

		this._value = "";
		this._fontEntity = new IgeFontEntity(ige)
			.left(0)
			.top(0)
			.textAlignX(options.textAlignX || 0)
			.textAlignY(options.textAlignY || 0);

		this._fontEntity.mount(this);

		// Set defaults
		this.font("10px Verdana");
		this.allowActive(false);
		this.allowFocus(false);
		this.allowHover(false);
	}

	textAlign (val) {
		if (val === undefined) {
			return this._alignText;
		}

		this._alignText = val;

		switch (val) {
			case "left":
				this._fontEntity.textAlignX(0);
				break;

			case "center":
				this._fontEntity.textAlignX(1);
				break;

			case "right":
				this._fontEntity.textAlignX(2);
				break;
		}
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
	width (px, lockAspect, modifier, noUpdate) {
		var val;

		// Call the main super class method
		val = super.width(px, lockAspect, modifier, noUpdate);

		// Update the font entity width - 10px for margin
		this._fontEntity.width(px, lockAspect, modifier, noUpdate);

		return val;
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
	height (px, lockAspect, modifier, noUpdate) {
		var val;

		// Call the main super class method
		val = super.height(px, lockAspect, modifier, noUpdate);

		// Update the font entity height
		this._fontEntity.height(px, lockAspect, modifier, noUpdate);

		return val;
	}

	/**
	 * Gets / sets the text value of the input box.
	 * @param {String=} val The text value.
	 * @return {*}
	 */
	value (val) {
		if (val !== undefined) {
			if (this._value !== val) {
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
					this._fontEntity.color(this._color);
				}

				this.emit("change", this._value);
			}
			return this;
		}

		return this._value;
	}

	/**
	 * Gets / sets the font sheet (texture) that the text box will
	 * use when rendering text inside the box.
	 * @param fontSheet
	 * @return {*}
	 */
	fontSheet (fontSheet) {
		if (fontSheet !== undefined) {
			this._fontSheet = fontSheet;

			// Set the font sheet as the texture for our font entity
			this._fontEntity.texture(this._fontSheet);
			return this;
		}

		return this._fontSheet;
	}

	font (val) {
		if (val !== undefined) {
			if (typeof(val) === "string") {
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

	nativeFont (val) {
		if (val !== undefined) {
			this._fontEntity.nativeFont(val);
			return this;
		}

		return this._fontEntity.nativeFont();
	}

	nativeStroke (val) {
		if (val !== undefined) {
			this._fontEntity.nativeStroke(val);
			return this;
		}

		return this._fontEntity.nativeStroke();
	}

	nativeStrokeColor (val) {
		if (val !== undefined) {
			this._fontEntity.nativeStrokeColor(val);
			return this;
		}

		return this._fontEntity.nativeStrokeColor();
	}

	color (val) {
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

export default IgeUiLabel;
