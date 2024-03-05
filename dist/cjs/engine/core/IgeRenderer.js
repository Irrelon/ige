"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeRenderer = void 0;
const IgePoint2d_1 = require("./IgePoint2d.js");
class IgeRenderer {
    constructor({ canvasElement, mode = "2d" }) {
        this._bounds2d = new IgePoint2d_1.IgePoint2d(40, 40);
        this._autoSize = true;
        this._devicePixelRatio = 1;
        this._resized = false;
        this._resizeEvent = (event) => {
            if (this._autoSize) {
                let newWidth = window.innerWidth;
                let newHeight = window.innerHeight;
                // Only update canvas dimensions if it exists
                if (this._canvasElement) {
                    // Check if we can get the position of the canvas
                    const canvasBoundingRect = this._canvasPosition();
                    // Adjust the newWidth and newHeight by the canvas offset
                    newWidth -= canvasBoundingRect.left;
                    newHeight -= canvasBoundingRect.top;
                    // Make sure we can divide the new width and height by 2...
                    // otherwise minus 1 so we get an even number so that we
                    // negate the blur effect of sub-pixel rendering
                    if (newWidth % 2) {
                        newWidth--;
                    }
                    if (newHeight % 2) {
                        newHeight--;
                    }
                    this._canvasElement.width = newWidth * this._devicePixelRatio;
                    this._canvasElement.height = newHeight * this._devicePixelRatio;
                    this._updateDevicePixelRatio();
                }
                this._bounds2d = new IgePoint2d_1.IgePoint2d(newWidth, newHeight);
            }
            else {
                if (this._canvasElement) {
                    this._bounds2d = new IgePoint2d_1.IgePoint2d(this._canvasElement.width, this._canvasElement.height);
                }
            }
            this._resized = true;
        };
        this._canvasElement = canvasElement;
        this._mode = mode;
        console.log("IGERENDERER INSTANTIATED");
    }
    /**
     * Gets the bounding rectangle for the HTML canvas element being
     * used as the front buffer for the engine. Uses DOM methods.
     * @private
     */
    _canvasPosition() {
        if (!this._canvasElement) {
            return {
                top: 0,
                left: 0
            };
        }
        try {
            return this._canvasElement.getBoundingClientRect();
        }
        catch (e) {
            return {
                top: this._canvasElement.offsetTop,
                left: this._canvasElement.offsetLeft
            };
        }
    }
    _updateDevicePixelRatio() {
        if (!this._canvasElement)
            return;
        // Support high-definition devices and "retina" displays by adjusting
        // for device and back store pixels ratios
        this._devicePixelRatio = window.devicePixelRatio || 1;
        if (this._devicePixelRatio !== 1) {
            this._canvasElement.style.width = this._bounds2d.x + "px";
            this._canvasElement.style.height = this._bounds2d.y + "px";
        }
    }
    renderSceneGraph(arr, bounds) {
        return true;
    }
    /**
     * Clears the entire canvas.
     */
    clear() {
        if (this._canvasElement && this._canvasContext2d) {
            // Clear the whole canvas
            this._canvasContext2d.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
        }
    }
}
exports.IgeRenderer = IgeRenderer;
