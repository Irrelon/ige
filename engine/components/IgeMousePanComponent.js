/**
 * When added to a viewport, automatically adds mouse panning
 * capabilities to the viewport's camera.
 */
var IgeMousePanComponent = IgeEventingClass.extend({
	classId: 'IgeMousePanComponent',
	componentId: 'mousePan',

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
		this._startThreshold = 5; // The number of pixels the mouse should move to activate a pan
	},

	/**
	 * Gets / sets the number of pixels after a mouse down that the mouse
	 * must move in order to activate a pan operation. Defaults to 5.
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
	 * Gets / sets the rectangle that the pan operation will be limited
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
	 * Gets / sets the enabled flag. If set to true, pan
	 * operations will be processed. If false, no panning will
	 * occur.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	enabled: function (val) {
		var self = this;

		if (val !== undefined) {
			this._enabled = val;

			// Reset pan values.
			// This prevents problems if mouse pan is disabled mid-pan.
			this._panPreStart = false;
			this._panStarted  = false;

			if (this._enabled) {
				// Listen for the mouse events we need to operate a mouse pan
				this._entity.mouseDown(function (event) { self._mouseDown(event); });
				this._entity.mouseMove(function (event) { self._mouseMove(event); });
				this._entity.mouseUp(function (event) { self._mouseUp(event); });
			} else {
				// Remove the pan start data
				delete this._panStartMouse;
				delete this._panStartCamera;
			}

			return this._entity;
		}

		return this._enabled;
	},

	/**
	 * Handles the mouseDown event. Records the starting position of the
	 * camera pan and the current camera translation.
	 * @param event
	 * @private
	 */
	_mouseDown: function (event) {
		if (!this._panStarted && this._enabled && event.igeViewport.id() === this._entity.id()) {
			// Record the mouse down position - pan pre-start
			var curMousePos = ige._mousePos;
			this._panStartMouse = curMousePos.clone();

			this._panStartCamera = {
				x: this._entity.camera._translate.x,
				y: this._entity.camera._translate.y
			};

			this._panPreStart = true;
			this._panStarted = false;
		}
	},

	/**
	 * Handles the mouse move event. Translates the camera as the mouse
	 * moves across the screen.
	 * @param event
	 * @private
	 */
	_mouseMove: function (event) {
		if (this._enabled) {
			// Pan the camera if the mouse is down
			if (this._panStartMouse) {
				var curMousePos = ige._mousePos,
					panCords = {
						x: this._panStartMouse.x - curMousePos.x,
						y: this._panStartMouse.y - curMousePos.y
					}, distX = Math.abs(panCords.x), distY = Math.abs(panCords.y),
					panFinalX = (panCords.x / this._entity.camera._scale.x) + this._panStartCamera.x,
					panFinalY = (panCords.y / this._entity.camera._scale.y) + this._panStartCamera.y;

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

				if (this._panPreStart) {
					// Check if we've reached the start threshold
					if (distX > this._startThreshold || distY > this._startThreshold) {
						this._entity.camera.translateTo(
							panFinalX,
							panFinalY,
							0
						);
						this.emit('panStart');
						this._panPreStart = false;
						this._panStarted = true;

						this.emit('panMove');
					}
				} else {
					// Pan has already started
					this._entity.camera.translateTo(
						panFinalX,
						panFinalY,
						0
					);

					this.emit('panMove');
				}
			}
		}
	},

	/**
	 * Handles the mouse up event. Finishes the camera translate and
	 * removes the starting pan data.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		if (this._enabled) {
			// End the pan
			if (this._panStarted) {
				if (this._panStartMouse) {
					var curMousePos = ige._mousePos,
						panCords = {
							x: this._panStartMouse.x - curMousePos.x,
							y: this._panStartMouse.y - curMousePos.y
						},
						panFinalX = (panCords.x / this._entity.camera._scale.x) + this._panStartCamera.x,
						panFinalY = (panCords.y / this._entity.camera._scale.y) + this._panStartCamera.y;

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

					this._entity.camera.translateTo(
						panFinalX,
						panFinalY,
						0
					);

					// Remove the pan start data to end the pan operation
					delete this._panStartMouse;
					delete this._panStartCamera;

					this.emit('panEnd');
					this._panStarted = false;
				}
			} else {
				delete this._panStartMouse;
				delete this._panStartCamera;
				this._panStarted = false;
			}
		}
	}
});
