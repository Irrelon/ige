var UiToolBox_ToolSelect = IgeEventingClass.extend({
	classId: 'UiToolBox_ToolSelect',
	
	init: function () {
		// Hook editor select object updates so we can keep in sync
		ige.editor.on('selectedObject', function (id) {
			ige._currentViewport.drawBounds(true);
			ige._currentViewport.drawBoundsLimitId(id);
		});
	},
	
	enabled: function (val) {
		if (val !== undefined) {
			this._enabled = val;
			
			if (val) {
				ige.editor.interceptMouse(true);
				
				var self = this;
		
				// Hook the engine's input system and take over mouse interaction
				this._mouseUpHandle = ige.editor.on('mouseUp', function (event) {
					self._mouseUp(event);
				});
				
				this._mouseDownHandle = ige.editor.on('mouseDown', function (event) {
					self._mouseDown(event);
				});
				
				this._mouseMoveHandle = ige.editor.on('mouseMove', function (event) {
					self._mouseMove(event);
				});
			} else {
				ige.editor.interceptMouse(false);
				ige.editor.off('mouseUp', this._mouseUpHandle);
				ige.editor.off('mouseDown', this._mouseDownHandle);
				ige.editor.off('mouseMove', this._mouseMoveHandle);
				
				if (ige.editor._selectedObject) {
					ige._currentViewport.drawBoundsData(true);
					ige._currentViewport.drawBoundsLimitId(ige.editor._selectedObject.id());
				} else {
					ige._currentViewport.drawBounds(false);
					ige._currentViewport.drawBoundsLimitId('');
				}
			}
		}
	},
	
	/**
	 * Handles the mouseDown event.
	 * @param event
	 * @private
	 */
	_mouseDown: function (event) {
		this.emit('mouseDown', event);
	},

	/**
	 * Handles the mouse move event.
	 * @param event
	 * @private
	 */
	_mouseMove: function (event) {
		var arr = ige.mouseOverList();
		if (arr.length) {
			if (!ige.editor._selectedObject) {
				ige._currentViewport.drawBounds(true);
				ige._currentViewport.drawBoundsData(true);
				ige._currentViewport.drawBoundsLimitId(arr[0].id());
			} else {
				ige._currentViewport.drawBounds(true);
				ige._currentViewport.drawBoundsData(true);
				ige._currentViewport.drawBoundsLimitId([ige.editor._selectedObject.id(), arr[0].id()]);
			}
			
			this._overObject = arr[0];
		} else {
			delete this._overObject;
			
			if (!ige.editor._selectedObject) {
				ige._currentViewport.drawBounds(false);
				ige._currentViewport.drawBoundsData(false);
				ige._currentViewport.drawBoundsLimitId('');
			} else {
				ige._currentViewport.drawBounds(true);
				ige._currentViewport.drawBoundsData(true);
				ige._currentViewport.drawBoundsLimitId(ige.editor._selectedObject.id());
			}
		}
		
		this.emit('mouseMove', event);
	},

	/**
	 * Handles the mouse up event.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		if (event.button === 0) {
			if (this._overObject) {
				ige.editor.selectObject(this._overObject.id());
				this.emit('selected', ige.editor._selectedObject);
				
				this.emit('mouseUp', event);
			}
		}
	},
	
	destroy: function () {
		this.enabled(false);
	}
});