/**
 * Creates a new font entity. A font entity will use a font sheet
 * (IgeFontSheet) and render text based on that font sheet's glyphs.
 */
var IgeFontEntity = IgeUiEntity.extend({
	classId: 'IgeFontEntity',

	init: function () {
		this._super();

		this._text = undefined;
		this._textAlignX = 1;
		this._textAlignY = 1;
		this._textLineSpacing = 0;
	},

	text: function (text) {
		if (text !== undefined) {
			this._text = text;
			return this;
		}

		return this._text;
	},

	textAlignX: function (val) {
		if (val !== undefined) {
			this._textAlignX = val;
			return this;
		}
		return this._textAlignX;
	},

	textAlignY: function (val) {
		if (val !== undefined) {
			this._textAlignY = val;
			return this;
		}
		return this._textAlignY;
	},

	textLineSpacing: function (val) {
		if (val !== undefined) {
			this._textLineSpacing = val;
			return this;
		}
		return this._textLineSpacing;
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
		var str = this._super(), i;

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