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
const exports_1 = require("../../export/exports.js");
const clientServer_1 = require("../utils/clientServer.js");
const IgeEventingClass_1 = require("./IgeEventingClass.js");
const IgePoint2d_1 = require("./IgePoint2d.js");
class IgeBaseRenderer extends IgeEventingClass_1.IgeEventingClass {
    constructor() {
        super();
        this._hasRunSetup = false;
        this._isReady = false;
        this._bounds2d = new IgePoint2d_1.IgePoint2d(800, 600);
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
            yield this._setup();
            exports_1.ige.engine.headless(false);
            this._isReady = true;
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
    }
    canvasElement() {
        return this._canvas;
    }
    renderSceneGraph(engine, viewports) {
        return this._renderSceneGraph(engine, viewports);
    }
    _renderSceneGraph(engine, viewports) {
        return false;
    }
}
exports.IgeBaseRenderer = IgeBaseRenderer;
