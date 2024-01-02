import { IgeComponent } from "../core/IgeComponent";
import { IgePoint2d } from "../core/IgePoint2d";
import { IgePoint3d } from "../core/IgePoint3d";
import type { IgeRect } from "../core/IgeRect";
import { ige } from "../instance";

/**
 * When added to a viewport, automatically adds mouse zooming
 * capabilities to the viewport's camera.
 */
export class IgeMouseZoomComponent extends IgeComponent {
	static componentTargetClass = "IgeViewport";
	classId = "IgeMouseZoomComponent";
	componentId = "mouseZoom";

	_enabled: boolean = false; // Set the zoom component to `inactive` to start with
	_limit?: IgeRect;
	_zoomStartMouse?: IgePoint3d;
	_zoomStartCamera?: IgePoint2d;

	/**
	 * Sets / gets the enabled flag. If set to true, zoom
	 * operations will be processed. If false, no zooming will
	 * occur.
	 * @param {boolean=} val
	 * @return {*}
	 */
	enabled (val?: boolean) {
		if (val === undefined) {
			return this._enabled;
		}

		this._enabled = val;

		if (this._enabled) {
			// Listen for the mouse events we need to operate a mouse zoom
			this._entity.pointerWheel(this._pointerWheel);
		} else {
			// Remove the zoom start data
			delete this._zoomStartMouse;
			delete this._zoomStartCamera;
		}

		return this._entity;
	}

	/**
	 * Handles the pointerDown event. Records the starting position of the
	 * camera zoom and the current camera translation.
	 * @param event
	 * @private
	 */
	_pointerDown = (event: Event) => {
		if (!this._enabled || event.igeViewport.id() !== this._entity.id()) {
			return;
		}

		const curMousePos = ige._pointerPos;
		this._zoomStartMouse = new IgePoint3d(curMousePos.x, curMousePos.y, 0);

		this._zoomStartCamera = new IgePoint2d(this._entity.camera._scale.x, this._entity.camera._scale.y);
	};

	/**
	 * Handles the mouse wheel event. Scales the camera as the wheel goes
	 * positive or negative delta.
	 * @param event
	 * @private
	 */
	_pointerWheel = (event: WheelEvent) => {
		if (!this._enabled) {
			return;
		}

		const zoomDelta = event.deltaY / 500;
		const currentScale = this._entity.camera._scale.x;
		const newZoom = currentScale - zoomDelta > 0.02 ? currentScale - zoomDelta : 0.02;

		this._entity.camera.scaleTo(newZoom, newZoom, 0);
	};

	/**
	 * Handles the mouse up event. Finishes the camera scale and
	 * removes the starting zoom data.
	 * @param event
	 * @private
	 */
	_pointerUp = (event: Event) => {
		if (!this._enabled) {
			return;
		}

		if (!this._zoomStartMouse || !this._zoomStartCamera) {
			return;
		}

		const curMousePos = ige._pointerPos;
		const zoomCords = {
			x: -(this._zoomStartMouse.x - curMousePos.x) / 100,
			y: -(this._zoomStartMouse.y - curMousePos.y) / 100
		};

		this._entity.camera.scaleTo(
			zoomCords.x + this._zoomStartCamera.x > 0.02 ? zoomCords.x + this._zoomStartCamera.x : 0.02,
			zoomCords.x + this._zoomStartCamera.x > 0.02 ? zoomCords.x + this._zoomStartCamera.x : 0.02,
			0
		);

		delete this._zoomStartMouse;
		delete this._zoomStartCamera;
	};
}
