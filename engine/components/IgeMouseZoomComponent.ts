import IgeEventingClass from "../core/IgeEventingClass";
import IgeBaseClass from "../core/IgeBaseClass";
import IgeComponent from "../core/IgeComponent";

/**
 * When added to a viewport, automatically adds mouse zooming
 * capabilities to the viewport's camera.
 */
class IgeMouseZoomComponent extends IgeComponent {
	classId = "IgeMouseZoomComponent";
	componentId = "mouseZoom";

	/**
	 * @constructor
	 * @param {IgeObject} entity The object that the component is added to.
	 * @param {Object=} options The options object that was passed to the component during
	 * the call to addComponent.
	 */
	constructor (entity: IgeBaseClass, options?: any) {
		super(entity, options);

		// Set the zoom component to inactive to start with
		this._enabled = false;
	}

	/**
	 * Sets / gets the enabled flag. If set to true, zoom
	 * operations will be processed. If false, no zooming will
	 * occur.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	enabled (val) {
		if (val === undefined) {
			return this._enabled;
		}

		this._enabled = val;

		if (this._enabled) {
			// Listen for the mouse events we need to operate a mouse zoom
			this._entity.mouseWheel(this._mouseWheel);
		} else {
			// Remove the zoom start data
			delete this._zoomStartMouse;
			delete this._zoomStartCamera;
		}

		return this._entity;
	}

	/**
	 * Handles the mouseDown event. Records the starting position of the
	 * camera zoom and the current camera translation.
	 * @param event
	 * @private
	 */
	_mouseDown (event) {
		if (!this._enabled || event.igeViewport.id() !== this._entity.id()) { return; }

		var curMousePos = this._ige._mousePos;
		this._zoomStartMouse = {
			"x": curMousePos.x,
			"y": curMousePos.y
		};
		this._zoomStartCamera = {
			"x": this._entity.camera._scale.x,
			"y": this._entity.camera._scale.y
		};
	}

	/**
	 * Handles the mouse wheel event. Scales the camera as the wheel goes
	 * positive or negative delta.
	 * @param event
	 * @private
	 */
	_mouseWheel = (event) => {
		if (!this._enabled) { return; }

		const curMousePos = this._ige._mousePos;

		const zoomDelta = event.deltaY / 500;
		const currentScale = this._entity.camera._scale.x;
		const newZoom = currentScale - zoomDelta > 0.02 ? currentScale - zoomDelta : 0.02;

		this._entity.camera.scaleTo(newZoom, newZoom, 0);
	}

	/**
	 * Handles the mouse up event. Finishes the camera scale and
	 * removes the starting zoom data.
	 * @param event
	 * @private
	 */
	_mouseUp (event) {
		if (!this._enabled) { return; }
		if (this._zoomStartMouse) {
			var curMousePos = this._ige._mousePos,
				zoomCords = {
					"x": -(this._zoomStartMouse.x - curMousePos.x) / 100,
					"y": -(this._zoomStartMouse.y - curMousePos.y) / 100
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

export default IgeMouseZoomComponent;
