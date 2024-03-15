import type { IgeFontSheet, IgeInputComponent, IgeTexture } from "@/export/exports";
import { ige, IgeFontAlignY, IgeFontEntity, IgeUiElement, registerClass } from "@/export/exports";

/**
 * Provides a UI text entry box. When provided with focus this UI entity will
 * capture keyboard input and display it, similar in usage to the HTML input
 * text element. Font defaults to aligning h-left and v-middle. You can change
 * this by accessing the textBox._fontEntity.textAlignY(IgeFontAlignY).
 */
// TODO: Make mouse pointer a text entry cursor on hover
// TODO: Make a flashing cursor
export class IgeUiTextBox extends IgeUiElement {
	classId = "IgeUiTextBox";

	_caretStart: number | null = 0;
	_caretEnd: number | null = 0;
	_fontEntity: IgeFontEntity;
	_fontSheet?: IgeFontSheet;
	_domElement?: HTMLInputElement;
	_placeHolder: string = "";
	_placeHolderColor: string = "";
	_mask: string = "";

	constructor () {
		super();

		this._value = "";

		this._fontEntity = new IgeFontEntity();
		this._fontEntity.left(5).middle(0).textAlignX(0).textAlignY(IgeFontAlignY.multiLineMiddle).mount(this);

		const blurFunc = () => {
			if (this._domElement) {
				this._domElement.parentNode?.removeChild(this._domElement);
				delete this._domElement;
			}
		};

		const focusFunc = () => {
			(ige.input as IgeInputComponent).stopPropagation();

			// First call blur to remove any previous background DOM element
			blurFunc();

			// Now we grab the screen position of the IGE element, so we
			// can position a DOM element over it
			const entScreenPos = this.screenPosition();

			// We create this DOM element ONLY because, on tablets and phones the browser
			// will not display the on-screen keyboard to allow text entry unless a
			// DOM element exists to type into
			const input = document.createElement("input");
			input.setAttribute("type", "text");

			// Position the DOM input element and set content
			input.style.position = "absolute";
			input.style.top = entScreenPos.y - this._bounds2d.y2 + "px";
			input.style.left = entScreenPos.x - this._bounds2d.x2 + "px";
			input.style.width = this._bounds2d.x + "px";
			input.style.height = this._bounds2d.y + "px";
			input.style.zIndex = "-1";
			input.style.opacity = "0";

			const body = document.getElementsByTagName("body")[0];
			body.appendChild(input);

			// Place browser focus on the DOM input element
			input.focus();

			// Now add the existing text to the DOM input element
			input.setAttribute("value", this._value);

			// Set the caret position to the end of the current value
			// so when the user types, text is appended to the end of
			// the existing value
			input.selectionStart = this._value.length;
			input.selectionEnd = this._value.length;

			this._caretStart = this._value.length;
			this._caretEnd = this._value.length;

			// Listen for events from the temp input element
			input.addEventListener("input", (event) => {
				this.value(input.value);
			});

			input.addEventListener("keyup", (event) => {
				if (event.key === "Enter") {
					// Enter pressed
					this.emit("enter", this._value);
				}
			});

			input.addEventListener("mouseup", (event) => {
				// Sync our internal caret position with the DOM element
				this._caretStart = input.selectionStart;
				this._caretEnd = input.selectionEnd;
			});

			// Not sure what to do here or if we need to. Blurring after instantiation is the issue
			// and only seems to occur on desktop, where an onscreen keyboard is not required anyway
			//input.addEventListener("blur", (event) => {
			//	console.log("Internal dom element lost focus");
			//	this.focus();
			//});

			this._domElement = input;
		};

		// On focus, create a temp input element in the DOM and focus to it
		this.on("focus", focusFunc);
		this.on("pointerUp", focusFunc);
		this.on("pointerDown", () => {
			(ige.input as IgeInputComponent).stopPropagation();
		});

		// Hook the uiUpdate event (emitted by the underlying IgeUiEntity) that
		// gets emitted when any updates have occurred to the ui styling of
		// the element / entity
		this.on("uiUpdate", () => {
			if (this._domElement) {
				// Update the transformation matrix
				this.updateTransform();

				const input = this._domElement,
					entScreenPos = this.screenPosition();

				// Reposition the dom element
				input.style.top = entScreenPos.y - this._bounds2d.y2 + "px";
				input.style.left = entScreenPos.x - this._bounds2d.x2 + "px";
			}
		});

		this.on("blur", blurFunc);
	}

	/**
	 * Gets / sets the textbox width.
	 * This method has been extended here to auto-update the width of the child
	 * font entity automatically to fill the text box when changes occur to the
	 * width of this entity.
	 * @param px
	 * @param lockAspect
	 * @param modifier
	 * @param noUpdate
	 * @return {*}
	 */
	width (px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
	width (): number;
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
	 * Gets / sets the textbox height.
	 * Extended method to auto-update the height of the child
	 * font entity automatically to fill the text box.
	 * @param px
	 * @param lockAspect
	 * @param modifier
	 * @param noUpdate
	 * @return {*}
	 */
	height (px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
	height (): number;
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
	 * Gets / sets the text value of the input box.
	 * @param {String=} val The text value.
	 * @return {*}
	 */
	value (val: string): this;
	value (): string;
	value (val?: string) {
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
			this._fontEntity.color(this._color as string);
		}

		this.emit("change", this._value);
		return this;
	}

	/**
	 * Gets / sets the placeholder text that is displayed inside the
	 * textbox when no current value is present.
	 * @param val
	 */
	placeHolder (val: string): this;
	placeHolder (): string;
	placeHolder (val?: string) {
		if (val !== undefined) {
			this._placeHolder = val;
			return this;
		}

		return this._placeHolder;
	}

	/**
	 * Gets / sets the font colour for the placeholder text.
	 * @param val
	 */
	placeHolderColor (val: string): this;
	placeHolderColor (): string;
	placeHolderColor (val?: string) {
		if (val !== undefined) {
			this._placeHolderColor = val;
			this._resolveTextColor();
			return this;
		}

		return this._placeHolderColor;
	}

	/**
	 * Gets / sets the text mask character to use that masks the input
	 * of the text rather than displaying the actual value. Useful for
	 * password entry boxes or other sensitive data. Will display one
	 * mask character per value character e.g.
	 * 		value = "hello"
	 * 		mask = "*"
	 * 		textbox will show: *****
	 * @param val
	 */
	mask (val: string): this;
	mask (): string;
	mask (val?: string) {
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
	fontSheet (fontSheet: IgeFontSheet): this;
	fontSheet (): IgeFontSheet | undefined;
	fontSheet (fontSheet?: IgeFontSheet) {
		if (fontSheet !== undefined) {
			this._fontSheet = fontSheet;

			// Set the font sheet as the texture for our font entity
			this._fontEntity.texture(fontSheet as unknown as IgeTexture);
			return this;
		}

		return this._fontSheet;
	}

	/**
	 * Gets / sets the current font for the textbox. If you pass
	 * a string, the textbox will automatically use native font
	 * rendering (use the canvas drawText() function). You can pass
	 *
	 * @example Get the current font
	 * 		const currentFont = textbox.font()
	 *
	 * @example Use a Native Font
	 * 		textbox.font("12px Verdana");
	 *
	 * @example Use an IgeFontSheet
	 * 		textbox.font(fontSheetInstance);
	 *
	 * @param val
	 */
	font (val: string | IgeFontSheet): this;
	font (): string | IgeFontSheet | undefined;
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

	/**
	 * Explicitly set the font to a native font.
	 * @see font
	 * @param val
	 */
	nativeFont (val: string): this;
	nativeFont (): string;
	nativeFont (val?: string) {
		if (val !== undefined) {
			this._fontEntity.nativeFont(val);
			return this;
		}

		return this._fontEntity.nativeFont();
	}

	/**
	 * Gets / sets the native font's stroke setting (how thick the font
	 * lines are). This is used in the canvas drawText() call.
	 *
	 * @example Set the stroke width to 2
	 * 		textbox.nativeStroke(2);
	 *
	 * @param val
	 */
	nativeStroke (val: number): this;
	nativeStroke (): number | undefined;
	nativeStroke (val?: number) {
		if (val !== undefined) {
			this._fontEntity.nativeStroke(val);
			return this;
		}

		return this._fontEntity.nativeStroke();
	}

	/**
	 * Gets / sets the native font's stroke colour.
	 *
	 * @example Set the stroke colour to red
	 * 		textbox.nativeStroke("#ff0000");
	 *
	 * @param val
	 */
	nativeStrokeColor (val: string): this;
	nativeStrokeColor (): string | undefined;
	nativeStrokeColor (val?: string) {
		if (val !== undefined) {
			this._fontEntity.nativeStrokeColor(val);
			return this;
		}

		return this._fontEntity.nativeStrokeColor();
	}

	/**
	 * Gets / sets the font colour of the textbox text displayed
	 * when the user types into the textbox.
	 *
	 * @example Set the text colour to black
	 * 		textbox.color("#000000");
	 *
	 * @param color
	 */
	color (color?: string | CanvasGradient | CanvasPattern): this;
	color (): string | CanvasGradient | CanvasPattern;
	color (color?: string | CanvasGradient | CanvasPattern) {
		if (color !== undefined) {
			this._color = color;
			this._resolveTextColor();
			if (!this._value && this._placeHolder && this._placeHolderColor) {
				this._fontEntity.color(this._placeHolderColor);
			} else {
				this._fontEntity.color(color as string);
			}
			return this;
		}

		return this._color;
	}

	_resolveTextColor () {
		// Check if the textbox has a text value, if so we want
		// to render the text in the color defined in this._color.
		if (this._value) {
			if (this._color) {
				this._fontEntity.color(this._color);
			}
			return;
		}

		// There is no current textbox text value so set the color
		// to the placeholder color if there is one
		if (this._placeHolderColor && this._placeHolder) {
			this._fontEntity.color(this._placeHolderColor);
			return;
		}
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
		return super.destroy();
	}
}

registerClass(IgeUiTextBox);
