"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeBaseRenderer = void 0;
const clientServer_1 = require("../clientServer.js");
const IgeEventingClass_1 = require("./IgeEventingClass.js");
const IgePoint2d_1 = require("./IgePoint2d.js");
const exports_1 = require("../../export/exports.js");
class IgeBaseRenderer extends IgeEventingClass_1.IgeEventingClass {
    constructor({ canvasElement, containerElement, mode }) {
        super();
        this._hasRunSetup = false;
        this._isReady = false;
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
                    const canvasBoundingRect = this._getCanvasElementPosition();
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
        this._containerElement = containerElement;
        this._canvasElement = canvasElement;
        this._mode = mode;
        this.log("++++++++++ Renderer Instantiated");
    }
    isReady() {
        return this._isReady;
    }
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            // Don't run setup on server, we don't render on the server,
            // so we don't need a canvas or rendering backend!
            if (clientServer_1.isServer)
                return;
            // Check if we've already run setup before
            if (this._hasRunSetup)
                return;
            yield this._getAdaptor();
            yield this._getDevice();
            this._createCanvas();
            this._updateDevicePixelRatio();
            this._getContext();
            this._addEventListeners();
            this._resizeEvent();
            exports_1.ige.engine._headless = false;
            this._isReady = true;
            this.log("Setup executed");
        });
    }
    _getAdaptor() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    _getDevice() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    _createCanvas() {
        // Create a new canvas element to use as the
        // rendering front-buffer
        this._canvasElement = document.createElement("canvas");
        this._canvasElement.className = "igeRendererOutput";
        (this._containerElement || document.body).appendChild(this._canvasElement);
    }
    _getContext() { }
    _addEventListeners() {
        window.addEventListener("resize", this._resizeEvent);
    }
    _removeEventListeners() {
        window.removeEventListener("resize", this._resizeEvent);
    }
    destroy() {
        this._removeEventListeners();
    }
    /**
     * Gets the bounding rectangle for the HTML canvas element being
     * used as the front buffer for the engine. Uses DOM methods.
     * @private
     */
    _getCanvasElementPosition() {
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
        if (exports_1.ige.engine._pixelRatioScaling) {
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
    renderSceneGraph(arr, bounds) {
        return true;
    }
    /**
     * Clear the entire canvas.
     */
    clear() { }
}
exports.IgeBaseRenderer = IgeBaseRenderer;
