/**
 * Provides a UI text entry box. When provided with focus this UI entity will
 * capture keyboard input and display it, similar in usage to the HTML input
 * text element.
 */
var IgeUiTextBox = IgeUiEntity.extend({
	classId: 'IgeUiTextBox',

	/**
	 * @constructor
	 */
	init: function () {
		IgeUiEntity.prototype.init.call(this);

		var self = this;

		this._hasFocus = false;
		this._value = '';

		this._fontEntity = new IgeFontEntity()
			.left(5)
			.middle(0)
			.textAlignX(0)
			.textAlignY(0)
			.mount(this);

		// Listen for keyboard events to capture text input
		ige.input.on('keyDown', function (event) { self._keyDown(event); });
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
		val = IgeUiEntity.prototype.width.call(this, px, lockAspect, modifier, noUpdate);

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
		val = IgeUiEntity.prototype.height.call(this, px, lockAspect, modifier, noUpdate);

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
			this._value = val;

			// Set the text of the font entity to the value
			this._fontEntity.text(this._value);
			return this;
		}

		return this._value;
	},

	/**
	 * Gets / sets if this input box should have focus. When the
	 * input box has focus it will respond to keyboard input.
	 * @param val
	 * @return {*}
	 */
	focus: function (val) {
		if (val !== undefined) {
			this._hasFocus = val;
			return this;
		}

		return this._hasFocus;
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

	/**
	 * Handles key down events. Will examine the key data and determine
	 * what to do with it for the text box.
	 * @param event
	 * @private
	 */
	_keyDown: function (event) {
		if (this._hasFocus) {
			// We have focus so handle the key input
			event.preventDefault();
			event.stopPropagation();
			event.returnValue = false;

			switch (event.keyCode) {
				case 8: // backspace
					// Remove the last character from the current value
					if (this._value.length > 0) {
						this.value(this._value.substr(0, this._value.length - 1));
					}
					break;

				case 13: // return
					break;

				default:
					this.value(this._value + String.fromCharCode(event.keyCode));
			}

		}
	}
});