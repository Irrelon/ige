"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeMouseZoomComponent = void 0;
const instance_1 = require("../instance");
const IgeComponent_1 = require("../core/IgeComponent");
const IgePoint3d_1 = require("../core/IgePoint3d");
const IgePoint2d_1 = require("../core/IgePoint2d");
/**
 * When added to a viewport, automatically adds mouse zooming
 * capabilities to the viewport's camera.
 */
class IgeMouseZoomComponent extends IgeComponent_1.IgeComponent {
	constructor() {
		super(...arguments);
		this.classId = "IgeMouseZoomComponent";
		this.componentId = "mouseZoom";
		this._enabled = false; // Set the zoom component to `inactive` to start with
		/**
		 * Handles the pointerDown event. Records the starting position of the
		 * camera zoom and the current camera translation.
		 * @param event
		 * @private
		 */
		this._pointerDown = (event) => {
			if (!this._enabled || event.igeViewport.id() !== this._entity.id()) {
				return;
			}
			const curMousePos = instance_1.ige._pointerPos;
			this._zoomStartMouse = new IgePoint3d_1.IgePoint3d(curMousePos.x, curMousePos.y, 0);
			this._zoomStartCamera = new IgePoint2d_1.IgePoint2d(
				this._entity.camera._scale.x,
				this._entity.camera._scale.y
			);
		};
		/**
		 * Handles the mouse wheel event. Scales the camera as the wheel goes
		 * positive or negative delta.
		 * @param event
		 * @private
		 */
		this._pointerWheel = (event) => {
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
		this._pointerUp = (event) => {
			if (!this._enabled) {
				return;
			}
			if (!this._zoomStartMouse || !this._zoomStartCamera) {
				return;
			}
			const curMousePos = instance_1.ige._pointerPos;
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
	/**
	 * Sets / gets the enabled flag. If set to true, zoom
	 * operations will be processed. If false, no zooming will
	 * occur.
	 * @param {boolean=} val
	 * @return {*}
	 */
	enabled(val) {
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
}
exports.IgeMouseZoomComponent = IgeMouseZoomComponent;
IgeMouseZoomComponent.componentTargetClass = "IgeViewport";
