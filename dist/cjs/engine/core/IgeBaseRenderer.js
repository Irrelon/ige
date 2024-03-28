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
const IgeEventingClass_1 = require("./IgeEventingClass.js");
const IgePoint2d_1 = require("./IgePoint2d.js");
const instance_1 = require("../instance.js");
const clientServer_1 = require("../utils/clientServer.js");
class IgeBaseRenderer extends IgeEventingClass_1.IgeEventingClass {
    constructor() {
        super();
        this.classId = "IgeBaseRenderer";
        this._hasRunSetup = false;
        this._isReady = false;
        this._bounds2d = new IgePoint2d_1.IgePoint2d(800, 600);
        this._createdFrontBuffer = false;
        this._pixelRatioScaling = true;
        this._devicePixelRatio = 1;
        this._autoSize = true;
        this._resized = false;
        this._resizeEvent = (event) => {
        };
        /**
         * Toggles full-screen output of the renderer canvas. Only works
         * if called from within a user-generated HTML event listener.
         */
        this.toggleFullScreen = () => {
        };
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
            // Now call the _setup() method which gets called
            // on the extending class, so we can control the order
            // that code executes rather than the extending class
            // overriding the setup() method
            yield this._setup();
            instance_1.ige.engine.headless(false);
            this.isReady(true);
            this.log("Setup executed");
        });
    }
    /**
     * Implement this setup function in the renderer that extends
     * this base class. Called once by the engine via the setup() function
     * when the renderer is first added. Will not run server-side.
     */
    _setup() {
        return __awaiter(this, void 0, void 0, function* () {
        });
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
    _addEventListeners() {
        //window.addEventListener("resize", this._resizeEvent);
    }
    _removeEventListeners() {
        //window.removeEventListener("resize", this._resizeEvent);
    }
    renderSceneGraph(engine, viewports) {
        return this._renderSceneGraph(engine, viewports);
    }
    _renderSceneGraph(engine, viewports) {
        return false;
    }
    _updateDevicePixelRatio() {
        if (instance_1.ige.engine._pixelRatioScaling) {
            // Support high-definition devices and "retina" displays by adjusting
            // for device and back store pixels ratios
            this._devicePixelRatio = window.devicePixelRatio || 1;
        }
        else {
            // No auto-scaling
            this._devicePixelRatio = 1;
        }
        if (!this._canvasElement)
            return;
        if (this._devicePixelRatio !== 1) {
            this._canvasElement.style.width = this._bounds2d.x + "px";
            this._canvasElement.style.height = this._bounds2d.y + "px";
        }
        //this.log(`Device pixel ratio is ${this._devicePixelRatio}`);
    }
}
exports.IgeBaseRenderer = IgeBaseRenderer;
