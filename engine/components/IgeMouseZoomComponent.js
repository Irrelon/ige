/**
 * When added to a viewport, automatically adds mouse zooming
 * capabilities to the viewport's camera.
 */
var IgeMouseZoomComponent = IgeEventingClass.extend({
	classId: 'IgeMouseZoomComponent',
	componentId: 'mouseZoom',

	/**
	 * @constructor
	 * @param {IgeObject} entity The object that the component is added to.
	 * @param {Object=} options The options object that was passed to the component during
	 * the call to addComponent.
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		// Set the zoom component to inactive to start with
		this._enabled = false;
	},

	/**
	 * Sets / gets the enabled flag. If set to true, zoom
	 * operations will be processed. If false, no zooming will
	 * occur.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	enabled: function (val) {
		var self = this;

		if (val !== undefined) {
			this._enabled = val;

			if (this._enabled) {
				// Listen for the mouse events we need to operate a mouse pan
				this._entity.mouseDown(function (event) { self._mouseDown(event); });
				this._entity.mouseMove(function (event) { self._mouseMove(event); });
				this._entity.mouseUp(function (event) { self._mouseUp(event); });
			} else {
				// Remove the zoom start data
				delete this._zoomStartMouse;
				delete this._zoomStartCamera;
			}

			return this._entity;
		}

		return this._enabled;
	},

	/**
	 * Handles the mouseDown event. Records the starting position of the
	 * camera zoom and the current camera translation.
	 * @param event
	 * @private
	 */
	_mouseDown: function (event) {
		if (this._enabled && event.igeViewport.id() === this._entity.id()) {
			// Record the mouse down position - zoom starting
			var curMousePos = ige._mousePos;
			this._zoomStartMouse = {
				x: curMousePos.x,
				y: curMousePos.y
			};

			this._zoomStartCamera = {
				x: this._entity.camera._scale.x,
				y: this._entity.camera._scale.y
			};
		}
	},

	/**
	 * Handles the mouse move event. Scales the camera as the mouse
	 * moves across the screen.
	 * @param event
	 * @private
	 */
	_mouseMove: function (event) {
		if (this._enabled) {
			// Zoom the camera if the mouse is down
			if (this._zoomStartMouse) {
				var curMousePos = ige._mousePos,
					zoomCords = {
						x: -(this._zoomStartMouse.x - curMousePos.x) / 100,
						y: -(this._zoomStartMouse.y - curMousePos.y) / 100
					};

				this._entity.camera.scaleTo(
					zoomCords.x + this._zoomStartCamera.x > 0.02 ? zoomCords.x + this._zoomStartCamera.x : 0.02,
					zoomCords.x + this._zoomStartCamera.x > 0.02 ? zoomCords.x + this._zoomStartCamera.x : 0.02,
					0
				);
			}
		}
	},

	/**
	 * Handles the mouse up event. Finishes the camera scale and
	 * removes the starting zoom data.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		if (this._enabled) {
			// End the zoom
			if (this._zoomStartMouse) {
				var curMousePos = ige._mousePos,
					zoomCords = {
						x: -(this._zoomStartMouse.x - curMousePos.x) / 100,
						y: -(this._zoomStartMouse.y - curMousePos.y) / 100
					};

				this._entity.camera.scaleTo(
					zoomCords.x + this._zoomStartCamera.x > 0.02 ? zoomCords.x + this._zoomStartCamera.x : 0.02,
					zoomCords.x + this._zoomStartCamera.x > 0.02 ? zoomCords.x + this._zoomStartCamera.x : 0.02,
					0
				);

				// Remove the zoom start data to end the zoom operation
				delete this._zoomStartMouse;
				delete this._zoomStartCamera;
			}
		}
	}
});