var IgeUiElement = IgeUiEntity.extend({
	classId: 'IgeUiElement',

	/**
	 * Constructor
	 */
	init: function () {
		var self = this;
		
		IgeUiEntity.prototype.init.call(this);
		ige.ui.registerElement(this);
		
		this._focused = false;
		this._allowHover = true;
		this._allowFocus = true;
		this._allowActive = true;
		
		var updateStyleFunc = function () {
			self._updateStyle();
		};
		
		this.on('mouseOver', function () {
			if (this._allowHover) {
				updateStyleFunc();
				ige.input.stopPropagation();
			} else {
				this._mouseStateOver = false;
			}
		});
		this.on('mouseOut', function () {
			if (this._allowHover) {
				updateStyleFunc();
				ige.input.stopPropagation();
			} else {
				this._mouseStateOver = false;
			}
		});
		this.on('mouseDown', function () {
			if (this._allowActive) {
				updateStyleFunc();
				ige.input.stopPropagation();
			} else {
				this._mouseStateDown = false;
			}
		});
		this.on('mouseUp', function () {
			if (this._allowFocus) {
				// Try to focus the entity
				if (!self.focus()) {
					updateStyleFunc();
				} else {
					ige.input.stopPropagation();
				}
			} else if (this._allowActive) {
				updateStyleFunc();
			}
		});
		
		// Enable mouse events on this entity by default
		this.mouseEventsActive(true);
	},
	
	allowHover: function (val) {
		if (val !== undefined) {
			this._allowHover = val;
			return this;
		}
		
		return this._allowHover;
	},
	
	allowFocus: function (val) {
		if (val !== undefined) {
			this._allowFocus = val;
			return this;
		}
		
		return this._allowFocus;
	},
	
	allowActive: function (val) {
		if (val !== undefined) {
			this._allowActive = val;
			return this;
		}
		
		return this._allowActive;
	},

	/**
	 * Gets / sets the applied style by name.
	 * @param {String=} name The style name to apply.
	 * @returns {*}
	 */
	styleClass: function (name) {
		if (name !== undefined) {
			// Add a period to the class name
			name = '.' + name;
			
			// Check for existing assigned style
			if (this._styleClass && this._styleClass !== name) {
				// Unregister this element from the style
				ige.ui.unRegisterElementStyle(this);
			}
			
			// Assign the new style
			this._styleClass = name;
			
			// Register the element for this style
			ige.ui.registerElementStyle(this);
			
			// Update the element style
			this._updateStyle();
			
			return this;
		}
		
		return this._styleClass;
	},
	
	_updateStyle: function () {
		// Apply styles in order of class, class:focus, class:hover, class:active,
		// id, id:focus, id:hover, id:active
		var styleName = this._styleClass,
			baseStyle;
		
		if (styleName) {
			baseStyle = ige.ui.style(styleName);
			
			if (baseStyle) {
				// Basic
				this.applyStyle(baseStyle);
				
				// Focus
				if (this._focused) {
					this.applyStyle(ige.ui.style(styleName + ':focus'));
				}
				
				// Hover
				if (this._mouseStateOver) {
					this.applyStyle(ige.ui.style(styleName + ':hover'));
				}
				
				// Active
				if (this._mouseStateDown) {
					this.applyStyle(ige.ui.style(styleName + ':active'));
				}
			}
		}
		
		styleName = '#' + this._id;
		baseStyle = ige.ui.style(styleName);
		
		if (baseStyle && styleName) {
			// Basic
			this.applyStyle(baseStyle);
			
			// Focus
			if (this._focused) {
				this.applyStyle(ige.ui.style(styleName + ':focus'));
			}
			
			// Hover
			if (this._mouseStateOver) {
				this.applyStyle(ige.ui.style(styleName + ':hover'));
			}
			
			// Active
			if (this._mouseStateDown) {
				this.applyStyle(ige.ui.style(styleName + ':active'));
			}
		}
	},

	/**
	 * Apply styles from a style data object. Usually you don't want to
	 * call this method directly but rather assign a style by name using
	 * the style() method, however it is not illegal practise to apply
	 * here if you wish if you have not defined a style by name and simply
	 * wish to apply style data directly.
	 * 
	 * Style property names must correspond to method names in the element
	 * class that the style is being applied to. You can see the default
	 * ui style methods available in the ./engine/extensions/IgeUi* files.
	 * 
	 * In the example below showing padding, you can see how the data assigned
	 * is passed to the "padding()" method as arguments, which is the same
	 * as calling "padding(10, 10, 10, 10);".
	 * 
	 * @example #Apply a background color
	 *     var elem = new IgeUiElement()
	 *         .applyStyle({
	 *             'backgroundColor': '#ffffff' // Set background color to white
	 *         });
	 *         
	 * @example #Apply padding with multiple arguments
	 *     var elem = new IgeUiElement()
	 *         .applyStyle({
	 *             'padding': [10, 10, 10, 10] // Set padding using multiple values
	 *         });
	 * 
	 * @param styleData
	 */
	applyStyle: function (styleData) {
		var args;
		
		if (styleData !== undefined) {
			// Loop the style data and apply styles as required
			for (var i in styleData) {
				if (styleData.hasOwnProperty(i)) {
					// Check that the style method exists
					if (typeof(this[i]) === 'function') {
						// The method exists, call it with the arguments
						if (styleData[i] instanceof Array) {
							args = styleData[i];
						} else {
							args = [styleData[i]];
						}
						
						this[i].apply(this, args);
					}
				}
			}
		}
	},

	/**
	 * Sets global UI focus to this element.
	 */
	focus: function () {
		if (ige.ui.focus(this)) {
			// Re-apply styles since the change
			this._updateStyle();
			return true;
		}
		
		return false;
	},
	
	blur: function () {
		if (ige.ui.blur(this)) {
			// Re-apply styles since the change
			this._updateStyle();
			return true;
		}
		
		return false;
	},
	
	focused: function () {
		return this._focused;
	},

	/**
	 * Destructor
	 */
	destroy: function () {
		ige.ui.unRegisterElement(this);
		IgeUiEntity.prototype.destroy.call(this);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiElement; }