var IgeUiButton = IgeUiElement.extend({
	classId: 'IgeUiButton',
	
	init: function () {
		var self = this;
		
		IgeUiElement.prototype.init.call(this);
		
		this.on('mouseDown', function () {
			if (self._autoCell) {
				// React to the mouse events
				self.cell(this._cell + 1);
				self.cacheDirty(true);
			}
		});
		
		this.on('mouseUp', function () {
			if (self._autoCell) {
				// React to the mouse events
				self.cell(this._cell - 1);
				self.cacheDirty(true);
			}
		});
	},

	/**
	 * Gets / sets the auto cell flag. If true the button will automatically
	 * react to being clicked on and update the texture cell to +1 when mousedown
	 * and -1 when mouseup allowing you to define cell sheets of button graphics
	 * with the up-state on cell 1 and the down-state on cell 2.
	 * @param {Boolean=} val Either true or false.
	 * @returns {*}
	 */
	autoCell: function (val) {
		if (val !== undefined) {
			this._autoCell = val;
			
			if (val) {
				this.mouseEventsActive(true);
			}
			return this;
		}
		
		return this._autoCell;
	},
	
	/**
	 * Fires a mouse-down and a mouse-up event for the entity.
	 * @returns {*}
	 */
	click: function () {
		if (this._mouseDown) { this._mouseDown(); }
		if (this._mouseUp) { this._mouseUp(); }

		return this;
	},
	
	tick: function (ctx) {
		IgeUiElement.prototype.tick.call(this, ctx);
		
		// Now draw any ui overlays
		
		// Check for the old way to assign text to the button
		var uiData = this.data('ui');
		if (uiData) {
			// Draw text
			if (uiData['text']) {
				ctx.font = uiData['text'].font || "normal 12px Verdana";
				ctx.textAlign = uiData['text'].align || 'center';
				ctx.textBaseline = uiData['text'].baseline || 'middle';
				ctx.fillStyle = uiData['text'].color || '#ffffff';
				ctx.fillText(uiData['text'].value, 0, 0);
			}
		}
		
		// Check for the new way to assign text to the button
		if (this._value) {
			// Draw text
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = this._color;
			ctx.fillText(this._value, 0, 0);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiButton; }