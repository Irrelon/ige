/**
 * Provides a UI text entry box. When provided with focus this UI entity will
 * capture keyboard input and display it, similar in usage to the HTML input
 * text element.
 */
import IgeUiElement from "../src/IgeUiElement";
import IgeFontEntity from "../src/IgeFontEntity";

//TODO: Make cursor a text entry cursor on hover
class IgeUiTextBox extends IgeUiElement {
	classId = "IgeUiTextBox";

	/**
	 * @constructor
	 */
	constructor (ige) {
		super(ige);

		this._value = "";
		this._caretStart = 0;
		this._caretEnd = 0;

		this._fontEntity = new IgeFontEntity(ige)
			.left(5)
			.middle(0)
			.textAlignX(0)
			.textAlignY(1);

		this._fontEntity.mount(this);

		const blurFunc = () => {
			if (this._domElement) {
				this._domElement.parentNode.removeChild(this._domElement);
				delete this._domElement;
			}
		};

		const focusFunc = () => {
			this._ige.input.stopPropagation();
			blurFunc();

			var input,
				body,
				entScreenPos = this.screenPosition();

			input = document.createElement("input");
			input.setAttribute("type", "text");

			// Position the infobox and set content
			input.style.position = "absolute";
			input.style.top = (entScreenPos.y - this._bounds2d.y2) + "px";
			input.style.left = (entScreenPos.x - this._bounds2d.x2) + "px";
			input.style.width = this._bounds2d.x + "px";
			input.style.zIndex = -1;
			input.style.opacity = "0";

			body = document.getElementsByTagName("body")[0];

			body.appendChild(input);
			input.focus();

			// Now add the existing text to the box
			input.setAttribute("value", this._value);

			// Set the caret position
			input.selectionStart = this._value.length;
			input.selectionEnd = this._value.length;

			this._caretStart = this._value.length;
			this._caretEnd = this._value.length;
			const self = this;
			// Listen for events from the temp input element
			input.addEventListener("keyup", (event) => {
				this.value(event.target.value);

				if (event.keyCode === 13) {
					// Enter pressed
					this.emit("enter", this._value);
				}
			});

			input.addEventListener("keydown", (event) => {
				this.value(event.target.value);
			});

			input.addEventListener("mouseup", function (event) {
				self._caretStart = this.selectionStart;
				self._caretEnd = this.selectionEnd;
			});

			input.addEventListener("blur", function (event) {
				this.focus();
			});

			this._domElement = input;
		};

		// On focus, create a temp input element in the DOM and focus to it
		this.on("focus", focusFunc);
		this.on("mouseUp", focusFunc);
		this.on("mouseDown", () => { this._ige.input.stopPropagation(); });

		this.on("uiUpdate", () => {
			if (self._domElement) {
				// Update the transformation matrix
				self.updateTransform();

				var input = self._domElement,
					entScreenPos = self.screenPosition();

				// Reposition the dom element
				input.style.top = (entScreenPos.y - self._bounds2d.y2) + "px";
				input.style.left = (entScreenPos.x - self._bounds2d.x2) + "px";
			}
		});

		this.on("blur", blurFunc);
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
		this._fontEntity.width(px - 10, lockAspect, modifier, noUpdate);

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
		if (val === undefined) {
			return this._value;
		}

		if (this._value === val) {
			return this;
		}

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

	placeHolder (val) {
		if (val !== undefined) {
			this._placeHolder = val;
			return this;
		}

		return this._placeHolder;
	}

	placeHolderColor (val) {
		if (val !== undefined) {
			this._placeHolderColor = val;
			return this;
		}

		return this._placeHolderColor;
	}

	mask (val) {
		if (val !== undefined) {
			this._mask = val;
			return this;
		}

		return this._mask;
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

	destroy () {
		/* The 'blur' function is called to destroy the DOM textbox. */
		this.blur();
		super.destroy();
	}
}

export default IgeUiTextBox;