"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeRenderer2d = void 0;
const IgeBaseRenderer_1 = require("./IgeBaseRenderer.js");
const exports_1 = require("../../export/exports.js");
class IgeRenderer2d extends IgeBaseRenderer_1.IgeBaseRenderer {
    constructor({ canvasElement, containerElement }) {
        super({ canvasElement, containerElement, mode: "2d" });
    }
    _getContext() {
        if (!this._canvasElement) {
            throw new Error("No canvas element was found when trying to get context");
        }
        this._canvasContext = this._canvasElement.getContext("2d");
        // If we didn't get a context, fail completely
        if (!this._canvasContext) {
            throw new Error("Could not get canvas context, renderer unable to start. This is a critical error that means the engine cannot start.");
        }
    }
    _updateDevicePixelRatio() {
        var _a;
        super._updateDevicePixelRatio();
        // Scale the canvas context to account for the change
        (_a = this._canvasContext) === null || _a === void 0 ? void 0 : _a.scale(this._devicePixelRatio, this._devicePixelRatio);
    }
    renderSceneGraph(arr, bounds) {
        const ctx = this._canvasContext;
        if (!ctx)
            return false;
        let ts;
        let td;
        if (arr) {
            ctx.save();
            ctx.translate(bounds.x2, bounds.y2);
            //ctx.scale(this._globalScale.x, this._globalScale.y);
            let arrCount = arr.length;
            // Loop our viewports and call their tick methods
            if (exports_1.ige.config.debug._timing) {
                while (arrCount--) {
                    ctx.save();
                    ts = new Date().getTime();
                    arr[arrCount].tick(ctx);
                    td = new Date().getTime() - ts;
                    if (arr[arrCount]) {
                        if (!exports_1.ige.engine._timeSpentInTick[arr[arrCount].id()]) {
                            exports_1.ige.engine._timeSpentInTick[arr[arrCount].id()] = 0;
                        }
                        if (!exports_1.ige.engine._timeSpentLastTick[arr[arrCount].id()]) {
                            exports_1.ige.engine._timeSpentLastTick[arr[arrCount].id()] = {};
                        }
                        exports_1.ige.engine._timeSpentInTick[arr[arrCount].id()] += td;
                        exports_1.ige.engine._timeSpentLastTick[arr[arrCount].id()].ms = td;
                    }
                    ctx.restore();
                }
            }
            else {
                while (arrCount--) {
                    ctx.save();
                    arr[arrCount].tick(ctx);
                    ctx.restore();
                }
            }
            ctx.restore();
        }
        return super.renderSceneGraph(arr, bounds);
    }
    /**
     * Clears the entire canvas.
     */
    clear() {
        if (!(this._canvasElement && this._canvasContext))
            return;
        this._canvasContext.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
    }
}
exports.IgeRenderer2d = IgeRenderer2d;
