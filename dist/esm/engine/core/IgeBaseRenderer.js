import {} from "../../export/exports.js"
import { ige } from "../../export/exports.js"
import { isServer } from "../clientServer.js"
import { IgeEventingClass } from "./IgeEventingClass.js";
import { IgePoint2d } from "./IgePoint2d.js"
export class IgeBaseRenderer extends IgeEventingClass {
    _canvas;
    _hasRunSetup = false;
    _isReady = false;
    _bounds2d = new IgePoint2d(800, 600);
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
        await this._setup();
        ige.engine.headless(false);
        this._isReady = true;
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
    }
    canvasElement() {
        return this._canvas;
    }
    _resizeEvent = (event) => {
    };
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
}
