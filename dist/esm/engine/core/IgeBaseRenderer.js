import { IgeEventingClass } from "./IgeEventingClass.js"
import { IgePoint2d } from "./IgePoint2d.js";
import { ige } from "../instance.js"
import { isServer } from "../utils/clientServer.js";
export class IgeBaseRenderer extends IgeEventingClass {
    classId = "IgeBaseRenderer";
    _canvasElement;
    _hasRunSetup = false;
    _isReady = false;
    _bounds2d = new IgePoint2d(800, 600);
    _createdFrontBuffer = false;
    _pixelRatioScaling = true;
    _devicePixelRatio = 1;
    _autoSize = true;
    _resized = false;
    constructor() {
        super();
    }
    async setup() {
        // Don't run setup on server, we don't render on the server,
        // so we don't need a canvas or rendering backend!
        if (isServer)
            return;
        // Check if we've already run setup before
        if (this._hasRunSetup)
            return;
        // Now call the _setup() method which gets called
        // on the extending class, so we can control the order
        // that code executes rather than the extending class
        // overriding the setup() method
        await this._setup();
        ige.engine.headless(false);
        this.isReady(true);
        this.log("Setup executed");
    }
    /**
     * Implement this setup function in the renderer that extends
     * this base class. Called once by the engine via the setup() function
     * when the renderer is first added. Will not run server-side.
     */
    async _setup() {
    }
    isReady(val) {
        if (val === undefined) {
            return this._isReady;
        }
        this._isReady = val;
        return this;
    }
    destroy() {
        this._removeEventListeners();
    }
    canvasElement(elem, autoSize = true) {
        return this._canvasElement;
    }
    _resizeEvent = (event) => {
    };
    _addEventListeners() {
        //window.addEventListener("resize", this._resizeEvent);
    }
    _removeEventListeners() {
        //window.removeEventListener("resize", this._resizeEvent);
    }
    renderSceneGraph(engine, viewports) {
        return this._renderSceneGraph(engine, viewports);
    }
    /**
     * Toggles full-screen output of the renderer canvas. Only works
     * if called from within a user-generated HTML event listener.
     */
    toggleFullScreen = () => {
    };
    _renderSceneGraph(engine, viewports) {
        return false;
    }
    _updateDevicePixelRatio() {
        if (!this._canvasElement)
            return;
        if (ige.engine._pixelRatioScaling) {
            // Support high-definition devices and "retina" displays by adjusting
            // for device and back store pixels ratios
            this._devicePixelRatio = window.devicePixelRatio || 1;
        }
        else {
            // No auto-scaling
            this._devicePixelRatio = 1;
        }
        if (this._devicePixelRatio !== 1) {
            this._canvasElement.style.width = this._bounds2d.x + "px";
            this._canvasElement.style.height = this._bounds2d.y + "px";
        }
        //this.log(`Device pixel ratio is ${this._devicePixelRatio}`);
    }
}
