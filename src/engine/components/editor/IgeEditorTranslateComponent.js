import { IgeComponent } from "../../core/IgeComponent.js";

/**
 * When added to a viewport, automatically adds entity translate
 * capabilities to the selected entity in the scenegraph viewer.
 */
class IgeEditorTranslateComponent extends IgeComponent {
	/**
	 * @constructor
	 * @param entity The object that the component is added to.
	 * @param options The options object that was passed to the component during
	 * the call to addComponent.
	 */
	constructor(entity, options) {
		super(entity, options);
		this.classId = "IgeEditorTranslateComponent";
		this.componentId = "editorTranslate";
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
				// Reset pan values.
				// This prevents problems if the component is disabled mid-operation.
				this._opPreStart = false;
				this._opStarted = false;
				if (this._enabled) {
					if (this._ige._sgTreeSelected) {
						this._targetEntity = this._ige.$(this._ige._sgTreeSelected);
						if (this._targetEntity.classId === "IgeViewport") {
							// Disable translation mode
							this.log("Editor: Mouse translate disabled");
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
							this.log("Editor: Mouse translate enabled");
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
				this._opStartTranslate = {
					x: this._targetEntity._translate.x,
					y: this._targetEntity._translate.y
				};
				this._opPreStart = true;
				this._opStarted = false;
				document.getElementById("igeSgEditorStatus").innerHTML =
					"X: " + this._targetEntity._translate.x + " Y:" + this._targetEntity._translate.y;
			}
		};
		/**
		 * Handles the mouse move event. Translates the entity as the mouse
		 * moves across the screen.
		 * @param event
		 * @private
		 */
		this._pointerMove = (event) => {
			if (this._enabled && this._targetEntity) {
				// Pan the camera if the mouse is down
				if (this._opStartMouse) {
					let curMousePos = this._ige._pointerPos,
						panCords = {
							x: this._opStartMouse.x - curMousePos.x,
							y: this._opStartMouse.y - curMousePos.y
						},
						distX = Math.abs(panCords.x),
						distY = Math.abs(panCords.y),
						panFinalX = this._opStartTranslate.x - panCords.x / this._ige._currentViewport.camera._scale.x,
						panFinalY = this._opStartTranslate.y - panCords.y / this._ige._currentViewport.camera._scale.y;
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
							this._targetEntity.translateTo(panFinalX, panFinalY, 0);
							this.emit("panStart");
							this._opPreStart = false;
							this._opStarted = true;
							this.emit("panMove");
						}
					} else {
						// Pan has already started
						this._targetEntity.translateTo(panFinalX, panFinalY, 0);
						this.emit("panMove");
					}
					document.getElementById("igeSgEditorStatus").innerHTML = "X: " + panFinalX + " Y:" + panFinalY;
				}
			}
		};
		/**
		 * Handles the mouse up event. Finishes the entity translate and
		 * removes the starting operation data.
		 * @param event
		 * @private
		 */
		this._pointerUp = (event) => {
			if (this._enabled && this._targetEntity) {
				// End the pan
				if (this._opStarted) {
					if (this._opStartMouse) {
						let curMousePos = this._ige._pointerPos,
							panCords = {
								x: this._opStartMouse.x - curMousePos.x,
								y: this._opStartMouse.y - curMousePos.y
							},
							panFinalX =
								this._opStartTranslate.x - panCords.x / this._ige._currentViewport.camera._scale.x,
							panFinalY =
								this._opStartTranslate.y - panCords.y / this._ige._currentViewport.camera._scale.y;
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
						this._targetEntity.translateTo(panFinalX, panFinalY, 0);
						document.getElementById("igeSgEditorStatus").innerHTML = "X: " + panFinalX + " Y:" + panFinalY;
						// Remove the pan start data to end the pan operation
						delete this._opStartMouse;
						delete this._opStartTranslate;
						this.emit("panEnd");
						this._opStarted = false;
					}
				} else {
					delete this._opStartMouse;
					delete this._opStartTranslate;
					this._opStarted = false;
				}
			}
		};
		// Set the pan component as inactive to start with
		this._enabled = false;
		this._startThreshold = 1; // The number of pixels the mouse should move to activate
	}
}
export default IgeEditorTranslateComponent;
