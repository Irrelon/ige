"use strict";

appCore.module('UiToolBox_ToolSelect', function ($ige, IgeEventingClass) {
	var UiToolBox_ToolSelect = IgeEventingClass.extend({
		classId: 'UiToolBox_ToolSelect',
		
		init: function () {
			var self = this;
			
			// Hook editor select object updates so we can keep in sync
			$ige.engine.editor.on('selectedObject', function (id) {
				$ige._currentViewport.drawBounds(true);
				$ige._currentViewport.drawBoundsLimitId(id);
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
			
			$ige.engine.editor.on('mouseUp', function (event) {
				if (event.button === 0) {
					$ige.engine.editor.ui.menus.closeAll();
				}
				
				// If right mouse button and an object is selected, show the
				// context menu for that object
				if (event.button === 2 && $ige.engine.editor._selectedObject) {
					var classArr = $ige.engine.editor._selectedObjectClassList,
						i;
					
					for (i = 0; i < classArr.length; i++) {
						
					}
					
					var body = $('body'),
						width = body.width(),
						height = body.height(),
						left = event.pageX,
						top = event.pageY;
					
					$ige.engine.editor.ui.menus.create({
						header: {
							icon: 'th-large',
							text: '[' + $ige.engine.editor._selectedObject.classId() + ']' + ' '  + $ige.engine.editor._selectedObject.id()
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
					$ige.engine.editor.interceptMouse(true);
					
					var self = this;
					
					// Hook the engine's input system and take over mouse interaction
					this._mouseUpHandle = $ige.engine.editor.on('mouseUp', function (event) {
						self._mouseUp(event);
					});
					
					this._mouseDownHandle = $ige.engine.editor.on('mouseDown', function (event) {
						self._mouseDown(event);
					});
					
					this._mouseMoveHandle = $ige.engine.editor.on('mouseMove', function (event) {
						self._mouseMove(event);
					});
				} else {
					$ige.engine.editor.interceptMouse(false);
					$ige.engine.editor.off('mouseUp', this._mouseUpHandle);
					$ige.engine.editor.off('mouseDown', this._mouseDownHandle);
					$ige.engine.editor.off('mouseMove', this._mouseMoveHandle);
					
					if ($ige.engine.editor._selectedObject) {
						$ige._currentViewport.drawBoundsData(true);
						$ige._currentViewport.drawBoundsLimitId($ige.engine.editor._selectedObject.id());
					} else {
						$ige._currentViewport.drawBounds(false);
						$ige._currentViewport.drawBoundsLimitId('');
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
			var arr = $ige.engine.mouseOverList();
			
			if (arr.length) {
				if (!$ige.engine.editor._selectedObject) {
					$ige._currentViewport.drawBounds(true);
					$ige._currentViewport.drawBoundsData(true);
					$ige._currentViewport.drawBoundsLimitId(arr[0].id());
				} else {
					$ige._currentViewport.drawBounds(true);
					$ige._currentViewport.drawBoundsData(true);
					$ige._currentViewport.drawBoundsLimitId([$ige.engine.editor._selectedObject.id(), arr[0].id()]);
				}
				
				this._overObject = arr;
			} else {
				delete this._overObject;
				
				if (!$ige.engine.editor._selectedObject) {
					$ige._currentViewport.drawBounds(false);
					$ige._currentViewport.drawBoundsData(false);
					$ige._currentViewport.drawBoundsLimitId('');
				} else {
					$ige._currentViewport.drawBounds(true);
					$ige._currentViewport.drawBoundsData(true);
					$ige._currentViewport.drawBoundsLimitId($ige.engine.editor._selectedObject.id());
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
			var body,
				width,
				height,
				left,
				top,
				menuOptions,
				obj,
				i;
			
			if (event.button === 0) {
				if (this._overObject && this._overObject.length) {
					// If overobject has more than one object, display menu allowing
					// selection
					if (this._overObject.length > 1) {
						body = $('body');
						width = body.width();
						height = body.height();
						left = event.pageX;
						top = event.pageY;
						menuOptions = [];
						
						for (i = 0; i < this._overObject.length; i++) {
							obj = this._overObject[i];
							
							menuOptions.push({
								id: 'select',
								icon: 'th-large',
								text: '[' + obj.classId() + ']' + ' '  + obj.id(),
								action: "ige.editor.selectObject('" + obj.id() + "');"
							});
						}
						
						$ige.engine.editor.ui.menus.create({
							header: {
								icon: 'log_in',
								text: 'Select Object'
							},
							groups: [{
								'options': menuOptions
							}]
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
					} else {
						$ige.engine.editor.selectObject(this._overObject.id());
						this.emit('selected', $ige.engine.editor._selectedObject);
						
						this.emit('mouseUp', event);
					}
				}
			}
		},
		
		_selectObject: function (id) {
			$ige.engine.editor.selectObject(id);
			this.emit('selected', $ige.engine.editor._selectedObject);
			
			this.emit('mouseUp', event);
		},
		
		destroy: function () {
			this.enabled(false);
		}
	});
	
	return UiToolBox_ToolSelect;
});