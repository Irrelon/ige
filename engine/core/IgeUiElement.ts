"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeUiElement', function ($ige, IgeUiEntity) {
	/**
	 * Creates a new UI element. UI elements use more resources and CPU
	 * than standard IgeEntity instances but provide a rich set of extra
	 * positioning and styling methods as well as reacting to styles
	 * defined using the IgeUiManagerComponent.
	 */
	var IgeUiElement = IgeUiEntity.extend({
		classId: 'IgeUiElement',
		
		/**
		 * Constructor
		 */
		init: function () {
			var self = this;
			
			IgeUiEntity.prototype.init.call(this);
			$ige.engine.ui.registerElement(this);
			
			this._focused = false;
			this._allowHover = true;
			this._allowFocus = true;
			this._allowActive = true;
			
			this.on('mouseOver', function () {
				if (this._allowHover) {
					self._updateStyle();
					$ige.engine.input.stopPropagation();
				} else {
					this._mouseStateOver = false;
				}
			});
			
			this.on('mouseOut', function () {
				if (this._allowHover) {
					self._updateStyle();
					$ige.engine.input.stopPropagation();
				} else {
					this._mouseStateOver = false;
				}
			});
			
			this.on('mouseDown', function () {
				if (this._allowActive) {
					self._updateStyle();
					$ige.engine.input.stopPropagation();
				} else {
					this._mouseStateDown = false;
				}
			});
			
			this.on('mouseUp', function () {
				if (this._allowFocus) {
					// Try to focus the entity
					if (!self.focus()) {
						self._updateStyle();
					} else {
						$ige.engine.input.stopPropagation();
					}
				} else if (this._allowActive) {
					self._updateStyle();
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
					$ige.engine.ui.unRegisterElementStyle(this);
				}
				
				// Assign the new style
				this._styleClass = name;
				
				// Register the element for this style
				$ige.engine.ui.registerElementStyle(this);
				
				// Update the element style
				this._updateStyle();
				
				return this;
			}
			
			return this._styleClass;
		},
		
		_updateStyle: function () {
			// Apply styles in order of class, class:focus, class:hover, class:active,
			// id, id:focus, id:hover, id:active
			this._processStyle(this._classId); // Get styles by element type (e.g. "IgeUiButton")
			this._processStyle(this._styleClass); // Get styles by class name (e.g. ".helpButton")
			this._processStyle('#' + this._id); // Get styles by element id (e.g. "#myHelpButton")
			
			if (this._focused) {
				this._processStyle(this._classId, 'focus');
				this._processStyle(this._styleClass, 'focus');
				this._processStyle('#' + this._id, 'focus');
			}
			
			if (this._mouseStateOver) {
				this._processStyle(this._classId, 'hover');
				this._processStyle(this._styleClass, 'hover');
				this._processStyle('#' + this._id, 'hover');
			}
			
			if (this._mouseStateDown) {
				this._processStyle(this._classId, 'active');
				this._processStyle(this._styleClass, 'active');
				this._processStyle('#' + this._id, 'active');
			}
		},
		
		_processStyle: function (styleName, state) {
			if (styleName) {
				if (state) {
					styleName += ':' + state;
				}
				
				//this.log('Checking for styles with selector: ' + styleName);
				
				// Basic
				var styleData = $ige.engine.ui.style(styleName);
				if (styleData) {
					//this.log('Applying styles with selector "' + styleName + '"');
					this.applyStyle(styleData);
				}
			}
		},
		
		/**
		 * Gets / sets a style for this individual element.
		 * @param {String=} property The property to get / set.
		 * @param {*=} value The value to set for the property.
		 * @return {*}
		 */
		style: function (property, value) {
			var elementStyles,
				classStyles,
				idStyles,
				allStyles = {},
				i;
			
			elementStyles = $ige.engine.ui.style(this._classId) || {}; // Get styles by element type (e.g. "IgeUiButton")
			classStyles = $ige.engine.ui.style(this._styleClass) || {}; // Get styles by class name (e.g. ".helpButton")
			idStyles = $ige.engine.ui.style('#' + this._id) || {}; // Get styles by element id (e.g. "#myHelpButton")
			
			for (i in elementStyles) {
				if (elementStyles.hasOwnProperty(i)) {
					allStyles[i] = elementStyles[i];
				}
			}
			
			for (i in classStyles) {
				if (classStyles.hasOwnProperty(i)) {
					allStyles[i] = classStyles[i];
				}
			}
			
			for (i in idStyles) {
				if (idStyles.hasOwnProperty(i)) {
					allStyles[i] = idStyles[i];
				}
			}
			
			if (property !== undefined) {
				if (value !== undefined) {
					// Assign property value to our idStyles object and
					// assign it back to the style management component
					idStyles[property] = value;
					$ige.engine.ui.style('#' + this._id, idStyles);
					return this;
				}
				
				return allStyles[property];
			}
			
			return allStyles;
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
		 * @param {Object} styleData The style object to apply. This object should
		 * contain key/value pairs where the key matches a method name and the value
		 * is the parameter to pass it.
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
			
			return this;
		},
		
		/**
		 * Sets global UI focus to this element.
		 */
		focus: function () {
			if ($ige.engine.ui.focus(this)) {
				// Re-apply styles since the change
				this._updateStyle();
				return true;
			}
			
			return false;
		},
		
		blur: function () {
			if ($ige.engine.ui.blur(this)) {
				// Re-apply styles since the change
				this._updateStyle();
				return true;
			}
			
			return false;
		},
		
		focused: function () {
			return this._focused;
		},
		
		value: function (val) {
			if (val !== undefined) {
				this._value = val;
				return this;
			}
			
			return this._value;
		},
		
		_mounted: function () {
			this._updateStyle();
		},
		
		/**
		 * Destructor
		 */
		destroy: function () {
			$ige.engine.ui.unRegisterElement(this);
			IgeUiEntity.prototype.destroy.call(this);
		}
	});
	
	return IgeUiElement;
});