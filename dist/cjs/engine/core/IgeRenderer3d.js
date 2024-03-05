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
exports.IgeRenderer3d = void 0;
const IgeBaseRenderer_1 = require("./IgeBaseRenderer.js");
const exports_1 = require("../../export/exports.js");
class IgeRenderer3d extends IgeBaseRenderer_1.IgeBaseRenderer {
    constructor({ canvasElement, containerElement }) {
        super({ canvasElement, containerElement, mode: "webgpu" });
        this._adapter = null;
        this._device = null;
        if (!navigator.gpu) {
            this.logError("Cannot start because `navigator.gpu` did not return a value");
        }
    }
    _getAdaptor() {
        return __awaiter(this, void 0, void 0, function* () {
            this._adapter = yield navigator.gpu.requestAdapter();
            if (!this._adapter) {
                this.logError("Cannot start because adapter not returned from `navigator.gpu.requestAdapter()`");
            }
        });
    }
    _getDevice() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._adapter) {
                this.logError("Cannot get device because no adaptor is present");
                return;
            }
            this._device = yield this._adapter.requestDevice();
            if (!this._device) {
                this.logError("Cannot start because device not returned from `adapter.requestDevice()`");
            }
            this._device.lost.then(() => {
                this.logError("GPU device has been lost");
                this._device = null;
                return null;
            });
        });
    }
    _getContext() {
        if (!this._canvasElement) {
            throw new Error("No canvas element was found when trying to get context");
        }
        if (!this._adapter)
            return;
        if (!this._device)
            return;
        this._canvasContext = this._canvasElement.getContext("webgpu");
        // If we didn't get a context, fail completely
        if (!this._canvasContext) {
            this.logError("Could not get canvas context, renderer unable to start. This is a critical error that means the engine cannot start.");
            return;
        }
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this._canvasContext.configure({
            device: this._device,
            format: presentationFormat,
            alphaMode: "opaque"
        });
    }
    renderSceneGraph(arr, bounds) {
        const ctx = this._canvasContext;
        if (!ctx)
            return false;
        let ts;
        let td;
        console.log("Render");
        if (arr) {
            //ctx.save();
            //ctx.translate(bounds.x2, bounds.y2);
            //ctx.scale(this._globalScale.x, this._globalScale.y);
            let arrCount = arr.length;
            // Loop our viewports and call their tick methods
            if (exports_1.ige.config.debug._timing) {
                while (arrCount--) {
                    //ctx.save();
                    ts = new Date().getTime();
                    //arr[arrCount].tick(ctx);
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
                    //ctx.restore();
                }
            }
            else {
                while (arrCount--) {
                    //ctx.save();
                    //arr[arrCount].tick(ctx);
                    //ctx.restore();
                    const entity = arr[arrCount];
                }
            }
            //ctx.restore();
        }
        return super.renderSceneGraph(arr, bounds);
    }
    /**
     * Clears the entire canvas.
     */
    clear() {
        if (!(this._canvasElement && this._canvasContext))
            return;
        //this._canvasContext.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
    }
}
exports.IgeRenderer3d = IgeRenderer3d;
