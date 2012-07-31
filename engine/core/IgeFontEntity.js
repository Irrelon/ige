var IgeFontEntity = IgeUiEntity.extend({
	classId: 'IgeFontEntity',

	init: function () {
		this._super();

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
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeFontEntity; }