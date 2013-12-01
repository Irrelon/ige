/**
 * Provides a UI label entity. Basic on-screen text label.
 */
var IgeUiLabel = IgeUiElement.extend({
	classId: 'IgeUiLabel',

	/**
	 * @constructor
	 */
	init: function () {
		IgeUiElement.prototype.init.call(this);

		var self = this;

		this._value = '';

		this._fontEntity = new IgeFontEntity()
			.left(0)
			.middle(0)
			.textAlignX(0)
			.textAlignY(0)
			.mount(this);
		
		// Set defaults
		this.font('10px Verdana');
		this.paddingLeft(5);
		this.allowActive(false);
		this.allowFocus(false);
		this.allowHover(false);
	},

	/**
	 * Extended method to auto-update the width of the child
	 * font entity automatically to fill the text box.
	 * @param px
	 * @param lockAspect
	 * @param modifier
	 * @param noUpdate
	 * @return {*}
	 */
	width: function (px, lockAspect, modifier, noUpdate) {
		var val;

		// Call the main super class method
		val = IgeUiElement.prototype.width.call(this, px, lockAspect, modifier, noUpdate);

		// Update the font entity width - 10px for margin
		this._fontEntity.width(px - 10, lockAspect, modifier, noUpdate);

		return val;
	},

	/**
	 * Extended method to auto-update the height of the child
	 * font entity automatically to fill the text box.
	 * @param px
	 * @param lockAspect
	 * @param modifier
	 * @param noUpdate
	 * @return {*}
	 */
	height: function (px, lockAspect, modifier, noUpdate) {
		var val;

		// Call the main super class method
		val = IgeUiElement.prototype.height.call(this, px, lockAspect, modifier, noUpdate);

		// Update the font entity height
		this._fontEntity.height(px, lockAspect, modifier, noUpdate);

		return val;
	},

	/**
	 * Gets / sets the text value of the input box.
	 * @param {String=} val The text value.
	 * @return {*}
	 */
	value: function (val) {
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
						this._fontEntity.text(new Array(this._value.length + 1).join(this._mask))
					}
					this._fontEntity.color(this._color);
				}
				
				this.emit('change', this._value);
			}
			return this;
		}

		return this._value;
	},
	
	/**
	 * Gets / sets the font sheet (texture) that the text box will
	 * use when rendering text inside the box.
	 * @param fontSheet
	 * @return {*}
	 */
	fontSheet: function (fontSheet) {
		if (fontSheet !== undefined) {
			this._fontSheet = fontSheet;

			// Set the font sheet as the texture for our font entity
			this._fontEntity.texture(this._fontSheet);
			return this;
		}

		return this._fontSheet;
	},
	
	font: function (val) {
		if (val !== undefined) {
			if (typeof(val) === 'string') {
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
	},
	
	nativeFont: function (val) {
		if (val !== undefined) {
			this._fontEntity.nativeFont(val);
			return this;
		}
		
		return this._fontEntity.nativeFont();
	},
	
	nativeStroke: function (val) {
		if (val !== undefined) {
			this._fontEntity.nativeStroke(val);
			return this;
		}
		
		return this._fontEntity.nativeStroke();
	},
	
	nativeStrokeColor: function (val) {
		if (val !== undefined) {
			this._fontEntity.nativeStrokeColor(val);
			return this;
		}
		
		return this._fontEntity.nativeStrokeColor();
	},
	
	color: function (val) {
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
	},
	
	_mounted: function () {
		// Check if we have a text value
		if (!this._value && this._placeHolder) {
			// Assign placeholder text and color
			this._fontEntity.text(this._placeHolder);
			this._fontEntity.color(this._placeHolderColor);
		}
		
		IgeUiElement.prototype._mounted.call(this);
	}
});