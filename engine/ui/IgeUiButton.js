var IgeUiButton = IgeUiEntity.extend({
	classId: 'IgeUiButton',

	click: function () {
		if (this._mouseDown) { this._mouseDown(); }
		if (this._mouseUp) { this._mouseUp(); }

		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiButton; }