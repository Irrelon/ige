"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../utils");
const IgeComponent_1 = require("../../core/IgeComponent");
/**
 * When added to a viewport, automatically adds entity rotate
 * capabilities to the selected entity in the scenegraph viewer.
 */
class IgeEditorRotateComponent extends IgeComponent_1.IgeComponent {
	/**
	 * @constructor
	 * @param entity The object that the component is added to.
	 * @param options The options object that was passed to the component during
	 * the call to addComponent.
	 */
	constructor(entity, options) {
		super(entity, options);
		this.classId = "IgeEditorRotateComponent";
		this.componentId = "editorRotate";
		/**
		 * Gets / sets the number of pixels after a mouse down that the mouse
		 * must move in order to activate the operation. Defaults to 1.
		 * @param val
		 * @return {*}
		 */
		this.startThreshold = (val) => {
			if (val !== undefined) {
				this._startThreshold = val;
				return this._entity;
			}
			return this._startThreshold;
		};
		/**
		 * Gets / sets the rectangle that the operation will be limited
		 * to using an IgeRect instance.
		 * @param {IgeRect=} rect
		 * @return {*}
		 */
		this.limit = (rect) => {
			if (rect !== undefined) {
				this._limit = rect;
				return this._entity;
			}
			return this._limit;
		};
		/**
		 * Gets / sets the enabled flag. If set to true,
		 * operations will be processed. If false, no operations will
		 * occur.
		 * @param {boolean=} val
		 * @return {*}
		 */
		this.enabled = (val) => {
			const self = this;
			if (val !== undefined) {
				this._enabled = val;
				// Reset rotate values.
				// This prevents problems if the component is disabled mid-operation.
				this._opPreStart = false;
				this._opStarted = false;
				if (this._enabled) {
					if (this._ige._sgTreeSelected && this._ige._sgTreeSelected !== "ige") {
						this._targetEntity = this._ige.$(this._ige._sgTreeSelected);
						if (this._targetEntity.classId === "IgeViewport") {
							// Disable translation mode
							this.log("Editor: Mouse rotate disabled");
							this.enabled(false);
						} else {
							// Listen for the mouse events we need to operate
							this._ige.input.on("pointerDown", (event) => {
								self._pointerDown(event);
							});
							this._ige.input.on("pointerMove", (event) => {
								self._pointerMove(event);
							});
							this._ige.input.on("pointerUp", (event) => {
								self._pointerUp(event);
							});
							this.log("Editor: Mouse rotate enabled");
						}
					}
				} else {
					// Remove the operation start data
					delete this._opStartMouse;
					delete this._opStartRotate;
				}
				return this._entity;
			}
			return this._enabled;
		};
		/**
		 * Handles the pointerDown event. Records the starting position of the
		 * operation and the current operation translation.
		 * @param event
		 * @private
		 */
		this._pointerDown = (event) => {
			if (!this._opStarted && this._enabled && this._targetEntity) {
				// Record the mouse down position - pre-start
				const curMousePos = this._ige._pointerPos;
				this._opStartMouse = curMousePos.clone();
				this._opStartRotate = {
					x: (0, utils_1.radiansToDegrees)(this._targetEntity._rotate.z)
				};
				this._opPreStart = true;
				this._opStarted = false;
				document.getElementById("igeSgEditorStatus").innerHTML =
					"Degrees: " + (0, utils_1.radiansToDegrees)(this._targetEntity._rotate.z);
			}
		};
		/**
		 * Handles the mouse move event. Rotates the entity as the mouse
		 * moves across the screen.
		 * @param event
		 * @private
		 */
		this._pointerMove = (event) => {
			if (this._enabled && this._targetEntity) {
				// Rotate the camera if the mouse is down
				if (this._opStartMouse) {
					const curMousePos = this._ige._pointerPos,
						rotateCords = {
							x: this._opStartMouse.x - curMousePos.x
						},
						distX = rotateCords.x - this._opStartRotate.x;
					if (this._opPreStart) {
						// Check if we've reached the start threshold
						if (Math.abs(distX) > this._startThreshold) {
							this._targetEntity.rotateTo(
								this._targetEntity._rotate.x,
								this._targetEntity._rotate.y,
								(0, utils_1.degreesToRadians)(-distX)
							);
							this.emit("rotateStart");
							this._opPreStart = false;
							this._opStarted = true;
							this.emit("rotateMove");
						}
					} else {
						// Rotate has already started
						this._targetEntity.rotateTo(
							this._targetEntity._rotate.x,
							this._targetEntity._rotate.y,
							(0, utils_1.degreesToRadians)(-distX)
						);
						this.emit("rotateMove");
					}
					document.getElementById("igeSgEditorStatus").innerHTML =
						"Degrees: " + (0, utils_1.radiansToDegrees)(this._targetEntity._rotate.z);
				}
			}
		};
		/**
		 * Handles the mouse up event. Finishes the entity rotate and
		 * removes the starting operation data.
		 * @param event
		 * @private
		 */
		this._pointerUp = (event) => {
			if (this._enabled && this._targetEntity) {
				// End the rotate
				if (this._opStarted) {
					if (this._opStartMouse) {
						const curMousePos = this._ige._pointerPos,
							rotateCords = {
								x: this._opStartMouse.x - curMousePos.x
							},
							distX = rotateCords.x - this._opStartRotate.x;
						this._targetEntity.rotateTo(
							this._targetEntity._rotate.x,
							this._targetEntity._rotate.y,
							(0, utils_1.degreesToRadians)(-distX)
						);
						document.getElementById("igeSgEditorStatus").innerHTML =
							"Degrees: " + (0, utils_1.radiansToDegrees)(this._targetEntity._rotate.z);
						// Remove the rotate start data to end the rotate operation
						delete this._opStartMouse;
						delete this._opStartRotate;
						this.emit("rotateEnd");
						this._opStarted = false;
					}
				} else {
					delete this._opStartMouse;
					delete this._opStartRotate;
					this._opStarted = false;
				}
			}
		};
		// Set the "rotate" component as inactive to start with
		this._enabled = false;
		this._startThreshold = 1; // The number of pixels the mouse should move to activate
	}
}
exports.default = IgeEditorRotateComponent;
