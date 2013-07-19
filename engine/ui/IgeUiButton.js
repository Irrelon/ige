var IgeUiButton = IgeUiEntity.extend({
	classId: 'IgeUiButton',

	click: function () {
		if (this._mouseDown) { this._mouseDown(); }
		if (this._mouseUp) { this._mouseUp(); }

		return this;
	},
	
	tick: function (ctx) {
		var uiData = this.data('ui');
		if (uiData) {
			// Draw text centered
			if (uiData['text']) {
				ctx.font = uiData['text'].font || "normal 12px Verdana";
				ctx.textAlign = uiData['text'].align || 'center';
				ctx.textBaseline = uiData['text'].baseline || 'middle';
				ctx.fillStyle = uiData['text'].color || '#ffffff';
				ctx.fillText(uiData['text'].value, 0, 0);
			}
		}
		
		IgeUiEntity.prototype.tick.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiButton; }