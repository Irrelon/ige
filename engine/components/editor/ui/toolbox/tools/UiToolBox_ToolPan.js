var UiToolBox_ToolPan = IgeEventingClass.extend({
	classId: 'UiToolBox_ToolPan',
	
	init: function () {
		
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
				
				// Reset pan values.
				this._opPreStart = false;
				this._opStarted  = false;
				this._startThreshold = 1; // The number of pixels the mouse should move to activate
			} else {
				ige.editor.interceptMouse(false);
				ige.editor.off('mouseUp', this._mouseUpHandle);
				ige.editor.off('mouseDown', this._mouseDownHandle);
				ige.editor.off('mouseMove', this._mouseMoveHandle);
			}
		}
	},
	
	/**
	 * Handles the mouseDown event. Records the starting position of the
	 * operation and the current operation translation.
	 * @param event
	 * @private
	 */
	_mouseDown: function (event) {
		if (!this._opStarted) {
			// Record the mouse down position - pre-start
			var mx = (event.igeX - ige._bounds2d.x2),
				my = (event.igeY - ige._bounds2d.y2),
				curMousePos = new IgePoint3d(mx, my, 0);
			
			this._opStartMouse = curMousePos.clone();

			this._opStartTranslate = {
				x: ige._translate.x,
				y: ige._translate.y
			};

			this._opPreStart = true;
			this._opStarted = false;
			//document.getElementById('igeSgEditorStatus').innerHTML = 'X: ' + ige._translate.x + ' Y:' + ige._translate.y;
		}
	},

	/**
	 * Handles the mouse move event. Translates the entity as the mouse
	 * moves across the screen.
	 * @param event
	 * @private
	 */
	_mouseMove: function (event) {
		// Pan the camera if the mouse is down
		if (this._opStartMouse) {
			var mx = (event.igeX - ige._bounds2d.x2),
				my = (event.igeY - ige._bounds2d.y2),
				curMousePos = {x: mx, y: my},
				panCords = {
					x: this._opStartMouse.x - curMousePos.x,
					y: this._opStartMouse.y - curMousePos.y
				}, distX = Math.abs(panCords.x), distY = Math.abs(panCords.y),
				panFinalX = this._opStartTranslate.x - (panCords.x / ige._currentViewport.camera._scale.x),
				panFinalY = this._opStartTranslate.y - (panCords.y / ige._currentViewport.camera._scale.y);

			if (this._opPreStart) {
				// Check if we've reached the start threshold
				if (distX > this._startThreshold || distY > this._startThreshold) {
					ige.translateTo(
						panFinalX,
						panFinalY,
						0
					);
					
					this.emit('panStart');
					this._opPreStart = false;
					this._opStarted = true;
					
					this.emit('panMove');
				}
			} else {
				// Pan has already started
				ige.translateTo(
					panFinalX,
					panFinalY,
					0
				);
				
				this.emit('panMove');
			}
			
			//document.getElementById('igeSgEditorStatus').innerHTML = 'X: ' + panFinalX + ' Y:' + panFinalY;
		}
	},

	/**
	 * Handles the mouse up event. Finishes the entity translate and
	 * removes the starting operation data.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		// End the pan
		if (this._opStarted) {
			if (this._opStartMouse) {
				var mx = (event.igeX - ige._bounds2d.x2),
					my = (event.igeY - ige._bounds2d.y2),
					curMousePos = {x: mx, y: my},
					panCords = {
						x: this._opStartMouse.x - curMousePos.x,
						y: this._opStartMouse.y - curMousePos.y
					},
					panFinalX = this._opStartTranslate.x - (panCords.x / ige._currentViewport.camera._scale.x),
					panFinalY = this._opStartTranslate.y - (panCords.y / ige._currentViewport.camera._scale.y);

				// Check if we have a limiter on the rectangle area
				// that we should allow panning inside.
				if (this._limit) {
					// Check the pan co-ordinates against
					// the limiter rectangle
					if (panFinalX < this._limit.x) {
						panFinalX = this._limit.x;
					}

					if (panFinalX > this._limit.x + this._limit.width) {
						panFinalX = this._limit.x + this._limit.width;
					}

					if (panFinalY < this._limit.y) {
						panFinalY = this._limit.y;
					}

					if (panFinalY > this._limit.y + this._limit.height) {
						panFinalY = this._limit.y + this._limit.height;
					}
				}

				ige.translateTo(
					panFinalX,
					panFinalY,
					0
				);
				
				//document.getElementById('igeSgEditorStatus').innerHTML = 'X: ' + panFinalX + ' Y:' + panFinalY; 

				// Remove the pan start data to end the pan operation
				delete this._opStartMouse;
				delete this._opStartTranslate;
				
				this.emit('panEnd');
				this._opStarted = false;
			}
		} else {
			delete this._opStartMouse;
			delete this._opStartTranslate;
			this._opStarted = false;
		}
	},
	
	destroy: function () {
		this.enabled(false);
	}
});