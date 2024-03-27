import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import { IgePoint2d } from "./IgePoint2d.js";
import { ige } from "../instance.js"
import { isClient, isServer } from "../utils/clientServer.js";
import { getElementPosition } from "../utils/general.js"
export class IgeCanvas2dRenderer extends IgeBaseRenderer {
    classId = "IgeCanvas2dRenderer";
    _canvasContext;
    async _setup() {
        await super._setup();
        this.createFrontBuffer();
        if (!this._canvasElement)
            return;
        this.isReady(true);
    }
    /**
     * Creates a front-buffer or "drawing surface" for the renderer.
     *
     * @param {Boolean} autoSize Determines if the canvas will auto-resize
     * when the browser window changes dimensions. If true the canvas will
     * automatically fill the window when it is resized.
     *
     * @param {Boolean=} dontScale If set to true, IGE will ignore device
     * pixel ratios when setting the width and height of the canvas and will
     * therefore not take into account "retina", high-definition displays or
     * those whose pixel ratio is different from 1 to 1.
     */
    createFrontBuffer(autoSize = true, dontScale = false) {
        if (!isClient) {
            return;
        }
        if (this._canvasElement) {
            return;
        }
        this._createdFrontBuffer = true;
        this._pixelRatioScaling = !dontScale;
        // Create a new canvas element to use as the
        // rendering front-buffer
        const tempCanvas = document.createElement("canvas");
        // Set the canvas element id
        tempCanvas.id = "igeFrontBuffer";
        this.canvasElement(tempCanvas, autoSize);
        document.body.appendChild(tempCanvas);
    }
    /**
     * Gets / sets the canvas element that will be used as the front-buffer.
     * @param elem The canvas element.
     * @param autoSize If set to true, the engine will automatically size
     * the canvas to the width and height of the window upon window resize.
     */
    canvasElement(elem, autoSize = true) {
        if (isServer)
            return;
        if (elem === undefined) {
            // Return current value
            return this._canvasElement;
        }
        this._canvasElement = elem;
        this._canvasContext = this._canvasElement.getContext("2d");
        if (!this._canvasContext) {
            throw new Error("Could not get canvas context!");
        }
        if (this._pixelRatioScaling) {
            // Support high-definition devices and "retina" displays by adjusting
            // for device and back store pixels ratios
            this._devicePixelRatio = window.devicePixelRatio || 1;
        }
        else {
            // No auto-scaling
            this._devicePixelRatio = 1;
        }
        this.log(`Device pixel ratio is ${this._devicePixelRatio}`);
        this._autoSize = autoSize;
        window.addEventListener("resize", this._resizeEvent);
        this._resizeEvent();
        this._canvasContext = this._canvasElement.getContext("2d");
        ige.engine.headless(false);
        // Ask the input component to set up any listeners it has
        ige.input.setupListeners(this._canvasElement);
    }
    _addEventListeners() {
        window.addEventListener("resize", this._resizeEvent);
    }
    _removeEventListeners() {
        window.removeEventListener("resize", this._resizeEvent);
    }
    /**
     * Clears the entire canvas.
     */
    clearCanvas() {
        if (!this._canvasElement || !this._canvasContext)
            return;
        this._canvasContext.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
    }
    /**
     * Removes the engine's canvas from the DOM.
     */
    removeCanvas() {
        // Stop listening for input events
        ige.input.destroyListeners(this._canvasElement);
        // Remove event listener
        window.removeEventListener("resize", this._resizeEvent);
        if (this._createdFrontBuffer && this._canvasElement) {
            // Remove the canvas from the DOM
            document.body.removeChild(this._canvasElement);
        }
        // Clear internal references
        delete this._canvasElement;
        this._canvasContext = null;
        ige.engine.headless(true);
    }
    _renderSceneGraph(engine, viewports) {
        const ctx = this._canvasContext;
        if (!ctx)
            return false;
        ctx.save();
        ctx.translate(this._bounds2d.x2, this._bounds2d.y2);
        //ctx.scale(this._globalScale.x, this._globalScale.y);
        // Process the current engine tick for all child objects
        if (viewports) {
            let arrCount = viewports.length;
            let ts, td;
            // Loop our viewports and call their tick methods
            if (ige.config.debug._timing) {
                while (arrCount--) {
                    ctx.save();
                    ts = new Date().getTime();
                    viewports[arrCount].tick(ctx);
                    td = new Date().getTime() - ts;
                    if (viewports[arrCount]) {
                        if (!ige.engine._timeSpentInTick[viewports[arrCount].id()]) {
                            ige.engine._timeSpentInTick[viewports[arrCount].id()] = 0;
                        }
                        if (!ige.engine._timeSpentLastTick[viewports[arrCount].id()]) {
                            ige.engine._timeSpentLastTick[viewports[arrCount].id()] = {};
                        }
                        ige.engine._timeSpentInTick[viewports[arrCount].id()] += td;
                        ige.engine._timeSpentLastTick[viewports[arrCount].id()].ms = td;
                    }
                    ctx.restore();
                }
            }
            else {
                while (arrCount--) {
                    ctx.save();
                    viewports[arrCount].tick(ctx);
                    ctx.restore();
                }
            }
        }
        ctx.restore();
        return true;
    }
    /**
     * Handles the screen resize event.
     * @param event
     * @private
     */
    _resizeEvent = (event) => {
        ige.engine._resizeEvent(event);
        let canvasBoundingRect;
        if (this._autoSize) {
            let newWidth = window.innerWidth;
            let newHeight = window.innerHeight;
            // Only update canvas dimensions if it exists
            if (this._canvasElement) {
                // Check if we can get the position of the canvas
                canvasBoundingRect = getElementPosition(this._canvasElement);
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
            this._bounds2d = new IgePoint2d(newWidth, newHeight);
        }
        else if (this._canvasElement) {
            this._bounds2d = new IgePoint2d(this._canvasElement.width, this._canvasElement.height);
        }
        if (ige.engine._showSgTree) {
            const sgTreeElem = document.getElementById("igeSgTree");
            if (sgTreeElem) {
                canvasBoundingRect = getElementPosition(this._canvasElement);
                sgTreeElem.style.top = canvasBoundingRect.top + 5 + "px";
                sgTreeElem.style.left = canvasBoundingRect.left + 5 + "px";
                sgTreeElem.style.height = this._bounds2d.y - 30 + "px";
            }
        }
        this._resized = true;
    };
    _updateDevicePixelRatio() {
        super._updateDevicePixelRatio();
        // Scale the canvas context to account for the change
        this._canvasContext?.scale(this._devicePixelRatio, this._devicePixelRatio);
    }
    /**
     * Toggles full-screen output of the main ige canvas. Only works
     * if called from within a user-generated HTML event listener.
     */
    toggleFullScreen = () => {
        const elem = this._canvasElement;
        if (!elem)
            return;
        if (elem.requestFullscreen) {
            return elem.requestFullscreen();
        }
        else if (elem.mozRequestFullScreen) {
            return elem.mozRequestFullScreen();
        }
        else if (elem.webkitRequestFullscreen) {
            return elem.webkitRequestFullscreen();
        }
    };
    destroy() {
        super.destroy();
        if (isClient) {
            this.removeCanvas();
        }
    }
}
