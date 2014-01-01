/**
 * Creates a new font entity. A font entity will use a font sheet
 * (IgeFontSheet) or native font and render text.
 */
var IgeFontEntity = IgeUiEntity.extend({
	classId: 'IgeFontEntity',

	init: function () {
		IgeUiEntity.prototype.init.call(this);

		this._renderText = undefined;
		this._text = undefined;
		this._textAlignX = 1;
		this._textAlignY = 1;
		this._textLineSpacing = 0;
		this._nativeMode = false;

		// Enable caching by default for font entities!
		this.cache(true);
	},

	/**
	 * Extends the IgeUiEntity.width() method and if the value being
	 * set is different from the current width value then the font's
	 * cache is invalidated so it gets redrawn.
	 * @param val
	 * @param lockAspect
	 * @param modifier
	 * @param noUpdate
	 * @returns {*}
	 */
	width: function (val, lockAspect, modifier, noUpdate) {
		if (val !== undefined) {
			if (this._bounds2d.x !== val) {
				this.clearCache();
			}
		}

		var retVal = IgeUiEntity.prototype.width.call(this, val, lockAspect, modifier, noUpdate);
		
		if (this._autoWrap) {
			this._applyAutoWrap();
		}
		
		return retVal;
	},

	/**
	 * Extends the IgeUiEntity.height() method and if the value being
	 * set is different from the current height value then the font's
	 * cache is invalidated so it gets redrawn.
	 * @param val
	 * @param lockAspect
	 * @param modifier
	 * @param noUpdate
	 * @returns {*|number}
	 */
	height: function (val, lockAspect, modifier, noUpdate) {
		if (val !== undefined) {
			if (this._bounds2d.y !== val) {
				this.clearCache();
			}
		}

		return IgeUiEntity.prototype.height.call(this, val, lockAspect, modifier, noUpdate);
	},

	/**
	 * Sets the text to render for this font entity. This sets both
	 * the private properties "_text" and "_renderText". If auto-wrapping
	 * has been enabled then the "_text" remains equal to whatever
	 * text you pass into this method but "_renderText" becomes the
	 * line-broken text that the auto-wrapper method creates. When the
	 * entity renders it's text string it ALWAYS renders from "_renderText"
	 * and not the value of "_text". Effectively this means that "_text"
	 * contains the unaltered version of your original text and 
	 * "_renderText" will be either the same as "_text" if auto-wrapping
	 * is disable or a wrapped version otherwise.
	 * @param {String} text The text string to render.
	 * @returns {*}
	 */
	text: function (text) {
		if (text !== undefined) {
			var wasDifferent = false;
			
			// Ensure we have a string
			text = String(text);
			
			if (this._text !== text) {
				this.clearCache();
				wasDifferent = true;
			}
			
			this._text = text;
			
			if (this._autoWrap && wasDifferent) {
				this._applyAutoWrap();
			} else {
				this._renderText = text;
			}
			
			return this;
		}

		return this._text;
	},

	/**
	 * Allows you to bind the text output of this font entity to match
	 * the value of an object's property so that when it is updated the
	 * text will automatically update on this entity. Useful for score,
	 * position etc output where data is stored in an object and changes
	 * frequently.
	 * @param {Object} obj The object to read the property from.
	 * @param {String} propName The name of the property to read value from.
	 * @param {String} preText Text to place before the output.
	 * @param {String} postText Text to place after the output.
	 * @returns {*}
	 */
	bindData: function (obj, propName, preText, postText) {
		if (obj !== undefined && propName !== undefined) {
			this._bindDataObject = obj;
			this._bindDataProperty = propName;
			this._bindDataPreText = preText || '';
			this._bindDataPostText = postText || '';
		}

		return this;
	},

	/**
	 * Gets / sets the current horizontal text alignment. Accepts
	 * a value of 0, 1 or 2 (left, centre, right) respectively.
	 * @param {Number=} val
	 * @returns {*}
	 */
	textAlignX: function (val) {
		if (val !== undefined) {
			if (this._textAlignX !== val) {
				this.clearCache();
			}
			this._textAlignX = val;
			return this;
		}
		return this._textAlignX;
	},

	/**
	 * Gets / sets the current vertical text alignment. Accepts
	 * a value of 0, 1 or 2 (top, middle, bottom) respectively.
	 * @param {Number=} val
	 * @returns {*}
	 */
	textAlignY: function (val) {
		if (val !== undefined) {
			if (this._textAlignY !== val) {
				this.clearCache();
			}
			this._textAlignY = val;
			return this;
		}
		return this._textAlignY;
	},

	/**
	 * Gets / sets the amount of spacing between the lines of text being
	 * rendered. Accepts negative values as well as positive ones.
	 * @param {Number=} val
	 * @returns {*}
	 */
	textLineSpacing: function (val) {
		if (val !== undefined) {
			if (this._textLineSpacing !== val) {
				this.clearCache();
			}
			this._textLineSpacing = val;
			return this;
		}
		return this._textLineSpacing;
	},

	/**
	 * Gets / sets the string hex or rgba value of the colour
	 * to use as an overlay when rending this entity's texture.
	 * @param {String=} val The colour value as hex e.g. '#ff0000'
	 * or as rgba e.g. 'rbga(255, 0, 0, 0.5)'. To remove an overlay
	 * colour simply passed an empty string.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	colorOverlay: function (val) {
		if (val !== undefined) {
			if (this._colorOverlay !== val) {
				this.clearCache();
			}
			this._colorOverlay = val;
			return this;
		}

		return this._colorOverlay;
	},

	/**
	 * A proxy for colorOverlay().
	 */
	color: function (val) {
		return this.colorOverlay(val);
	},

	/**
	 * Clears the texture cache for this entity's text string.
	 */
	clearCache: function () {
		if (this._cache) {
			this.cacheDirty(true);
		}

		if (this._texture && this._texture._caching && this._texture._cacheText[this._renderText]) {
			delete this._texture._cacheText[this._renderText];
		}
	},

	/**
	 * When using native font rendering (canvasContext.fillText())
	 * this sets the font and size as per the canvasContext.font
	 * string specification.
	 * @param {String=} val The font style string.
	 * @return {*} "this" when arguments are passed to allow method
	 * chaining or the current value if no arguments are specified.
	 */
	nativeFont: function (val) {
		if (val !== undefined) {
			// Check if this font is different from the current
			// assigned font
			if (this._nativeFont !== val) {
				// The fonts are different, clear existing cache
				this.clearCache();
			}
			this._nativeFont = val;

			// Assign the native font smart texture
			var tex = new IgeTexture(IgeFontSmartTexture);
			this.texture(tex);
			
			// Set the flag indicating we are using a native font
			this._nativeMode = true;

			return this;
		}

		return this._nativeFont;
	},

	/**
	 * Gets / sets the text stroke size that applies when using
	 * a native font for text rendering.
	 * @param {Number=} val The size of the text stroke.
	 * @return {*}
	 */
	nativeStroke: function (val) {
		if (val !== undefined) {
			if (this._nativeStroke !== val) {
				this.clearCache();
			}
			this._nativeStroke = val;
			return this;
		}

		return this._nativeStroke;
	},

	/**
	 * Gets / sets the text stroke color that applies when using
	 * a native font for text rendering.
	 * @param {Number=} val The color of the text stroke.
	 * @return {*}
	 */
	nativeStrokeColor: function (val) {
		if (val !== undefined) {
			if (this._nativeStrokeColor !== val) {
				this.clearCache();
			}
			this._nativeStrokeColor = val;
			return this;
		}

		return this._nativeStrokeColor;
	},

	/**
	 * Gets / sets the auto-wrapping mode. If set to true then the
	 * text this font entity renders will be automatically line-broken
	 * when a line reaches the width of the entity.
	 * @param val
	 * @returns {*}
	 */
	autoWrap: function (val) {
		if (val !== undefined) {
			this._autoWrap = val;
			
			// Execute an auto-wrap modification of the text
			if (this._text) {
				this._applyAutoWrap();
				this.clearCache();
			}
			return this;
		}
		
		return this._autoWrap;
	},

	/**
	 * Automatically detects where line-breaks need to occur in the text
	 * assigned to the entity and adds them.
	 * @private
	 */
	_applyAutoWrap: function () {
		if (this._text) {
			// Un-wrap the text so it is all on one line
			var oneLineText = this._text.replace(/\n/g, ' '),
				words,
				wordIndex,
				textArray = [],
				currentTextLine = '',
				lineWidth;
			
			// Break the text into words
			words = oneLineText.split(' ');
			
			// There are multiple words - loop the words
			for (wordIndex = 0; wordIndex < words.length; wordIndex++) {
				if (currentTextLine) {
					currentTextLine += ' ';
				}
				currentTextLine += words[wordIndex];
				
				// Check the width and if greater than the width of the entity,
				// add a line break before the word
				lineWidth = this.measureTextWidth(currentTextLine);
				
				if (lineWidth >= this._bounds2d.x) {
					// Start a new line
					currentTextLine = words[wordIndex];
					
					// Add a line break
					textArray.push('\n' + words[wordIndex]);
				} else {
					textArray.push(words[wordIndex]);
				}
				
			}
			
			this._renderText = textArray.join(' ');
		}
	},

	/**
	 * Will measure and return the width in pixels of a line or multiple
	 * lines of text. If no text parameter is passed, will use the current
	 * text assigned to the font entity.
	 * @param {String=} text Optional text to measure, used existing entity
	 * text value if none is provided.
	 * @returns {Number} The width of the text in pixels.
	 */
	measureTextWidth: function (text) {
		text = text || this._text;
		
		// Both IgeFontSheet and the IgeFontSmartTexture have a method
		// called measureTextWidth() so we can just asks the current
		// texture for the width :)
		if (this._texture._mode === 0) {
			return this._texture.measureTextWidth(text);
		} else {
			return this._texture.script.measureTextWidth(text, this);
		}
	},

	tick: function (ctx) {
		// Check for an auto-progress update
		if (this._bindDataObject && this._bindDataProperty) {
			if (this._bindDataObject._alive === false) {
				// The object we have bind data from has been
				// destroyed so release our reference to it!
				delete this._bindDataObject;
			} else {
				this.text(this._bindDataPreText + this._bindDataObject[this._bindDataProperty] + this._bindDataPostText);
			}
		}

		IgeUiEntity.prototype.tick.call(this, ctx);
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {String}
	 */
	_stringify: function () {
		// Get the properties for all the super-classes
		var str = IgeUiEntity.prototype._stringify.call(this), i;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
					case '_text':
						str += ".text(" + this.text() + ")";
						break;
					case '_textAlignX':
						str += ".textAlignX(" + this.textAlignX() + ")";
						break;
					case '_textAlignY':
						str += ".textAlignY(" + this.textAlignY() + ")";
						break;
					case '_textLineSpacing':
						str += ".textLineSpacing(" + this.textLineSpacing() + ")";
						break;
				}
			}
		}

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeFontEntity; }