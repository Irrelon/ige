/**
 * Provides a UI text entry box. When provided with focus this UI entity will
 * capture keyboard input and display it, similar in usage to the HTML input
 * text element.
 */
var IgeUiTextBox = IgeUiElement.extend({
	classId: 'IgeUiTextBox',

	/**
	 * @constructor
	 */
	init: function () {
		IgeUiElement.prototype.init.call(this);

		var self = this;

		this._value = '';
		this._caretStart = 0;
		this._caretEnd = 0;

		this._fontEntity = new IgeFontEntity()
			.left(5)
			.middle(0)
			.textAlignX(0)
			.textAlignY(0)
			.mount(this);
		
		var blurFunc = function () {
			if (self._domElement) {
				self._domElement.parentNode.removeChild(self._domElement);
				delete self._domElement;
			}
		};
		
		var focusFunc = function () {
			blurFunc();
			
			var input,
				body,
				entScreenPos = self.screenPosition();
			
			input = document.createElement('input');
			input.setAttribute('type', 'text');
			
			// Position the infobox and set content
			input.style.position = 'absolute';
			input.style.top = (entScreenPos.y - self._geometry.y2) + 'px';
			input.style.left = (entScreenPos.x - self._geometry.x2) + 'px';
			input.style.width = self._geometry.x + 'px';
			input.style.zIndex = -1;
			input.style.opacity = '0';
			
			body = document.getElementsByTagName('body')[0];
			
			body.appendChild(input);
			input.focus();
			
			// Now add the existing text to the box
			input.setAttribute('value', self._value);
			
			// Set the caret position
			input.selectionStart = self._value.length;
			input.selectionEnd = self._value.length;
			
			self._caretStart = self._value.length;
			self._caretEnd = self._value.length;
			
			// Listen for events from the temp input element
			input.addEventListener('keyup', function (event) {
				self.value(this.value);
				
				if (event.keyCode === 13) {
					// Enter pressed
					self.emit('enter', self._value);
				}
			});
			
			input.addEventListener('keydown', function (event) {
				self.value(this.value);
			});
			
			input.addEventListener('mouseup', function (event) {
				self._caretStart = this.selectionStart;
				self._caretEnd = this.selectionEnd;
			});
			
			input.addEventListener('blur', function (event) {
				this.focus();
			});
			
			self._domElement = input;
		};
		
		// On focus, create a temp input element in the DOM and focus to it
		this.on('focus', focusFunc);
		this.on('mouseUp', focusFunc);
		
		this.on('uiUpdate', function () {
			if (self._domElement) {
				// Update the transformation matrix
				self.updateTransform();
				
				var input = self._domElement,
					entScreenPos = self.screenPosition();
				
				// Reposition the dom element
				input.style.top = (entScreenPos.y - self._geometry.y2) + 'px';
				input.style.left = (entScreenPos.x - self._geometry.x2) + 'px';
			}
		});
		
		this.on('blur', blurFunc);
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
	
				// Set the text of the font entity to the value
				this._fontEntity.text(this._value);
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
	}
});