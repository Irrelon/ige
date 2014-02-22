var UiToolBox_ToolSelect = IgeEventingClass.extend({
	classId: 'UiToolBox_ToolSelect',
	
	init: function () {
		var self = this;
		
		// Hook editor select object updates so we can keep in sync
		ige.editor.on('selectedObject', function (id) {
			ige._currentViewport.drawBounds(true);
			ige._currentViewport.drawBoundsLimitId(id);
		});
		
		this.menuDefinition = {
			'IgeEntity': [{
				'mode': [{
					id: 'select',
					icon: 'hand-top',
					text: 'Select',
					action: "ige.editor.ui.toolbox.select('toolSelect');"
				}],
				'transform': [{
					sep: true,
					id: 'transform',
					icon: 'th',
					text: 'Transform',
					action: "ige.editor.ui.toolbox.select('toolTransform');"
				}, {
					id: 'translate',
					icon: 'move',
					text: 'Translate',
					action: "ige.editor.ui.toolbox.select('toolTranslate');"
				}, {
					id: 'rotate',
					icon: 'repeat',
					text: 'Rotate',
					action: "ige.editor.ui.toolbox.select('toolRotate');"
				}, {
					id: 'scale',
					icon: 'resize-full',
					text: 'Scale',
					action: "ige.editor.ui.toolbox.select('toolRotate');"
				}],
				'export': [{
					sep: true,
					id: 'export',
					icon: 'download-alt',
					text: 'Export...'
				}, {
					id: 'export-tree',
					icon: 'sort-by-attributes',
					text: 'Export Composite...'
				}],
				'action': [{
					sep: true,
					id: 'destroy',
					icon: 'certificate',
					text: 'Destroy',
					action: "ige.editor.destroySelected();"
				}]
			}]
		};
		
		ige.editor.on('mouseUp', function (event) {
			if (event.button === 0) {
				ige.editor.ui.menus.closeAll();
			}
			
			if (event.button === 2 && ige.editor._selectedObject) {
				var classArr = ige.editor._selectedObjectClassList,
					i;
					
				for (i = 0; i < classArr.length; i++) {
					
				}
				
				var body = $('body'),
					width = body.width(),
					height = body.height(),
					left = event.pageX,
					top = event.pageY;
				
				ige.editor.ui.menus.create({
					header: {
						icon: 'th-large',
						text: '[' + ige.editor._selectedObject.classId() + ']' + ' '  + ige.editor._selectedObject.id()
					},
					groups: self.menuDefinition.IgeEntity
				}, function (elem) {
					// Now position the menu
					var menuWidth = elem.width(),
						menuHeight = elem.height();
					
					if (left + menuWidth > width) {
						left = width - menuWidth - 10;
					}
					
					if (top + menuHeight > height) {
						top = height - menuHeight - 10;
					}
					
					elem.css('left', left)
						.css('top', top);
				});
			}
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