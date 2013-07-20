/**
 * When added to a viewport, automatically adds entity translate
 * capabilities to the selected entity in the scenegraph viewer.
 */
var IgeEditorTranslateComponent = IgeEventingClass.extend({
	classId: 'IgeEditorTranslateComponent',
	componentId: 'editorTranslate',

	/**
	 * @constructor
	 * @param {IgeObject} entity The object that the component is added to.
	 * @param {Object=} options The options object that was passed to the component during
	 * the call to addComponent.
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		// Set the pan component to inactive to start with
		this._enabled = false;
		this._startThreshold = 1; // The number of pixels the mouse should move to activate
	},

	/**
	 * Gets / sets the number of pixels after a mouse down that the mouse
	 * must move in order to activate the operation. Defaults to 1.
	 * @param val
	 * @return {*}
	 */
	startThreshold: function (val) {
		if (val !== undefined) {
			this._startThreshold = val;
			return this._entity;
		}

		return this._startThreshold;
	},

	/**
	 * Gets / sets the rectangle that the operation will be limited
	 * to using an IgeRect instance.
	 * @param {IgeRect=} rect
	 * @return {*}
	 */
	limit: function (rect) {
		if (rect !== undefined) {
			this._limit = rect;
			return this._entity;
		}

		return this._limit;
	},

	/**
	 * Gets / sets the enabled flag. If set to true, 
	 * operations will be processed. If false, no operations will
	 * occur.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	enabled: function (val) {
		var self = this;

		if (val !== undefined) {
			this._enabled = val;

			// Reset pan values.
			// This prevents problems if the component is disabled mid-operation.
			this._opPreStart = false;
			this._opStarted  = false;

			if (this._enabled) {
				if (ige._sgTreeSelected) {
					this._targetEntity = ige.$(ige._sgTreeSelected);
					
					if (this._targetEntity.classId() == 'IgeViewport') {
						// Disable translation mode
						this.log('Editor: Mouse translate disabled');
						this.enabled(false);
					} else {
						// Listen for the mouse events we need to operate
						ige.input.on('mouseDown', function (event) { self._mouseDown(event); });
						ige.input.on('mouseMove', function (event) { self._mouseMove(event); });
						ige.input.on('mouseUp', function (event) { self._mouseUp(event); });
						this.log('Editor: Mouse translate enabled');
					}
				}
			} else {
				// Remove the operation start data
				delete this._opStartMouse;
				delete this._opStartTranslate;
			}

			return this._entity;
		}

		return this._enabled;
	},

	/**
	 * Handles the mouseDown event. Records the starting position of the
	 * operation and the current operation translation.
	 * @param event
	 * @private
	 */
	_mouseDown: function (event) {
		if (!this._opStarted && this._enabled && this._targetEntity) {
			// Record the mouse down position - pre-start
			var curMousePos = ige._mousePos;
			this._opStartMouse = curMousePos.clone();

			this._opStartTranslate = {
				x: this._targetEntity._translate.x,
				y: this._targetEntity._translate.y
			};

			this._opPreStart = true;
			this._opStarted = false;
			
			document.getElementById('igeSgEditorStatus').innerHTML = 'X: ' + this._targetEntity._translate.x + ' Y:' + this._targetEntity._translate.y;
		}
	},

	/**
	 * Handles the mouse move event. Translates the entity as the mouse
	 * moves across the screen.
	 * @param event
	 * @private
	 */
	_mouseMove: function (event) {
		if (this._enabled && this._targetEntity) {
			// Pan the camera if the mouse is down
			if (this._opStartMouse) {
				var curMousePos = ige._mousePos,
					panCords = {
						x: this._opStartMouse.x - curMousePos.x,
						y: this._opStartMouse.y - curMousePos.y
					}, distX = Math.abs(panCords.x), distY = Math.abs(panCords.y),
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

				if (this._opPreStart) {
					// Check if we've reached the start threshold
					if (distX > this._startThreshold || distY > this._startThreshold) {
						this._targetEntity.translateTo(
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
					this._targetEntity.translateTo(
						panFinalX,
						panFinalY,
						0
					);

					this.emit('panMove');
				}
				
				document.getElementById('igeSgEditorStatus').innerHTML = 'X: ' + panFinalX + ' Y:' + panFinalY;
			}
		}
	},

	/**
	 * Handles the mouse up event. Finishes the entity translate and
	 * removes the starting operation data.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		if (this._enabled && this._targetEntity) {
			// End the pan
			if (this._opStarted) {
				if (this._opStartMouse) {
					var curMousePos = ige._mousePos,
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

					this._targetEntity.translateTo(
						panFinalX,
						panFinalY,
						0
					);
					
					document.getElementById('igeSgEditorStatus').innerHTML = 'X: ' + panFinalX + ' Y:' + panFinalY; 

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
		}
	}
});
