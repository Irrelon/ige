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

		var self = this;

		// Set the pan component to inactive to start with
		this._enabled = false;

		// Listen for the mouse events we need to operate a mouse pan
		ige.input.on('mouseDown', function (event) { self._mouseDown(event); });
		ige.input.on('mouseMove', function (event) { self._mouseMove(event); });
		ige.input.on('mouseUp', function (event) { self._mouseUp(event); });
	},

	/**
	 * Sets / gets the enabled flag. If set to true, pan
	 * operations will be processed. If false, no panning will
	 * occur.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	enabled: function (val) {
		if (val !== undefined) {
			this._enabled = val;

			if (!this._enabled) {
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
		if (this._enabled) {
			// Record the mouse down position - pan starting
			var curMousePos = ige._mousePos;
			this._panStartMouse = {
				x: curMousePos.x,
				y: curMousePos.y
			};

			this._panStartCamera = {
				x: this._entity.camera._translate.x,
				y: this._entity.camera._translate.y
			};
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
					};

				this._entity.camera.translateTo(
					panCords.x + this._panStartCamera.x,
					panCords.y + this._panStartCamera.y,
					0
				);
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
			if (this._panStartMouse) {
				var curMousePos = ige._mousePos,
					panCords = {
						x: this._panStartMouse.x - curMousePos.x,
						y: this._panStartMouse.y - curMousePos.y
					};

				this._entity.camera.translateTo(
					panCords.x + this._panStartCamera.x,
					panCords.y + this._panStartCamera.y,
					0
				);

				// Remove the pan start data to end the pan operation
				delete this._panStartMouse;
				delete this._panStartCamera;
			}
		}
	}
});