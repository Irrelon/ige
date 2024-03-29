import { IgeComponent } from "../core/IgeComponent.js"
import { IgePoint2d } from "../core/IgePoint2d.js"
import { ige } from "../instance.js"
/**
 * When added to a viewport, automatically adds mouse panning
 * capabilities to the viewport's camera.
 */
export class IgeMousePanComponent extends IgeComponent {
    static componentTargetClass = "IgeViewport";
    classId = "IgeMousePanComponent";
    componentId = "mousePan";
    _enabled = false; // Set the pan component to `inactive` to start with
    _startThreshold = 5; // The number of pixels the mouse should move to activate a pan
    _limit;
    _panPreStart = false;
    _panStarted = false;
    _panStartMouse;
    _panStartCamera;
    /**
     * Gets / sets the number of pixels after a mouse down that the mouse
     * must move in order to activate a pan operation. Defaults to 5.
     * @param val
     * @return {*}
     */
    startThreshold = (val) => {
        if (val !== undefined) {
            this._startThreshold = val;
            return this._entity;
        }
        return this._startThreshold;
    };
    /**
     * Gets / sets the rectangle that the pan operation will be limited
     * to using an IgeBounds instance.
     * @param {IgeBounds=} rect
     * @return {*}
     */
    limit(rect) {
        if (rect !== undefined) {
            this._limit = rect;
            return this._entity;
        }
        return this._limit;
    }
    /**
     * Gets / sets the enabled flag. If set to true, pan
     * operations will be processed. If false, no panning will
     * occur.
     * @param {boolean=} val
     * @return {*}
     */
    enabled(val) {
        if (val === undefined) {
            return this._enabled;
        }
        this._enabled = val;
        // Reset pan values.
        // This prevents problems if mouse pan is disabled mid-pan.
        this._panPreStart = false;
        this._panStarted = false;
        if (this._enabled) {
            // Listen for the mouse events we need to operate a mouse pan
            this._entity.pointerDown(this._pointerDown);
            this._entity.pointerMove(this._pointerMove);
            this._entity.pointerUp(this._pointerUp);
        }
        else {
            // Remove the pan start data
            delete this._panStartMouse;
            delete this._panStartCamera;
        }
        return this._entity;
    }
    /**
     * Handles the pointerDown event. Records the starting position of the
     * camera pan and the current camera translation.
     * @param event
     * @private
     */
    _pointerDown = (event) => {
        if (!(!this._panStarted && this._enabled && event?.igeViewport.id() === this._entity.id())) {
            return;
        }
        const curMousePos = ige._pointerPos;
        this._panStartMouse = curMousePos.clone();
        this._panStartCamera = new IgePoint2d(this._entity.camera._translate.x, this._entity.camera._translate.y);
        this._panPreStart = true;
        this._panStarted = false;
    };
    /**
     * Handles the mouse move event. Translates the camera as the mouse
     * moves across the screen.
     * @param event
     * @private
     */
    _pointerMove = (event) => {
        if (!this._enabled) {
            return;
        }
        if (!this._panStartMouse || !this._panStartCamera) {
            return;
        }
        const curMousePos = ige._pointerPos;
        const panCords = {
            x: this._panStartMouse.x - curMousePos.x,
            y: this._panStartMouse.y - curMousePos.y
        };
        const distX = Math.abs(panCords.x);
        const distY = Math.abs(panCords.y);
        let panFinalX = panCords.x / this._entity.camera._scale.x + this._panStartCamera.x;
        let panFinalY = panCords.y / this._entity.camera._scale.y + this._panStartCamera.y;
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
                // Added Math.floor() to the cam translate based on PR https://github.com/Irrelon/ige/pull/480/files#diff-62b741c85b3e221e93c63d1dabefe7e78dc80a3a3ec16f7d31b5b1839f88d115R87
                this._entity.camera.translateTo(Math.floor(panFinalX), Math.floor(panFinalY), 0);
                this.emit("panStart");
                this._panPreStart = false;
                this._panStarted = true;
                this.emit("panMove");
            }
        }
        else {
            // Pan has already started
            // Added Math.floor() to the cam translate based on PR https://github.com/Irrelon/ige/pull/480/files#diff-62b741c85b3e221e93c63d1dabefe7e78dc80a3a3ec16f7d31b5b1839f88d115R96
            this._entity.camera.translateTo(Math.floor(panFinalX), Math.floor(panFinalY), 0);
            this.emit("panMove");
        }
    };
    /**
     * Handles the mouse up event. Finishes the camera translate and
     * removes the starting pan data.
     * @param event
     * @private
     */
    _pointerUp = (event) => {
        if (!this._enabled) {
            return;
        }
        if (!this._panStarted) {
            delete this._panStartMouse;
            delete this._panStartCamera;
            this._panStarted = false;
            return;
        }
        if (!this._panStartMouse || !this._panStartCamera) {
            return;
        }
        const curMousePos = ige._pointerPos;
        const panCords = {
            x: this._panStartMouse.x - curMousePos.x,
            y: this._panStartMouse.y - curMousePos.y
        };
        let panFinalX = panCords.x / this._entity.camera._scale.x + this._panStartCamera.x;
        let panFinalY = panCords.y / this._entity.camera._scale.y + this._panStartCamera.y;
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
        // From PR https://github.com/Irrelon/ige/pull/480/files#diff-62b741c85b3e221e93c63d1dabefe7e78dc80a3a3ec16f7d31b5b1839f88d115R96
        this._entity.camera.translateTo(Math.floor(panFinalX), Math.floor(panFinalY), 0);
        delete this._panStartMouse;
        delete this._panStartCamera;
        this.emit("panEnd");
        this._panStarted = false;
    };
}
