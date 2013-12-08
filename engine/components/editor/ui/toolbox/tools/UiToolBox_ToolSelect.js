var UiToolBox_ToolSelect = IgeEventingClass.extend({
	classId: 'UiToolBox_ToolSelect',
	
	init: function () {
		
	},
	
	ready: function () {
		ige.editor.on('selected', function (id) {
			
		});
	},
	
	enabled: function (val) {
		if (val !== undefined) {
			this._enabled = val;
			
			if (val) {
				var self = this;
		
				// Hook the engine's input system and take over mouse interaction
				this._mouseUpHandle = ige.input.on('preMouseUp', function (event) {
					self._mouseUp(event);
					
					// Return true to stop this event from being emitted by the engine to the scenegraph
					return true;
				});
				
				this._mouseDownHandle = ige.input.on('preMouseDown', function (event) {
					self._mouseDown(event);
					
					// Return true to stop this event from being emitted by the engine to the scenegraph
					return true;
				});
				
				this._mouseMoveHandle = ige.input.on('preMouseMove', function (event) {
					self._mouseMove(event);
					
					// Return true to stop this event from being emitted by the engine to the scenegraph
					return true;
				});
			} else {
				ige.input.off('preMouseUp', this._mouseUpHandle);
				ige.input.off('preMouseDown', this._mouseDownHandle);
				ige.input.off('preMouseMove', this._mouseMoveHandle);
				
				if (ige.editor._selectedObject) {
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
				ige._currentViewport.drawBoundsLimitId(arr[0].id());
			} else {
				ige._currentViewport.drawBounds(true);
				ige._currentViewport.drawBoundsLimitId([ige.editor._selectedObject.id(), arr[0].id()]);
			}
			
			this._overObject = arr[0];
		} else {
			delete this._overObject;
			
			if (!ige.editor._selectedObject) {
				ige._currentViewport.drawBounds(false);
				ige._currentViewport.drawBoundsLimitId('');
			} else {
				ige._currentViewport.drawBoundsLimitId(ige.editor._selectedObject.id());
			}
		}
	},

	/**
	 * Handles the mouse up event.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		ige.editor._selectedObject = this._overObject;
		this.emit('selected', ige.editor._selectedObject);
	},
	
	destroy: function () {
		this.enabled(false);
	}
});