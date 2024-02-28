"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeRenderer2d = void 0;
const IgeRenderer_1 = require("./IgeRenderer.js");
const instance_1 = require("../instance.js");
class IgeRenderer2d extends IgeRenderer_1.IgeRenderer {
    _updateDevicePixelRatio() {
        var _a;
        super._updateDevicePixelRatio();
        // Scale the canvas context to account for the change
        (_a = this._canvasContext2d) === null || _a === void 0 ? void 0 : _a.scale(this._devicePixelRatio, this._devicePixelRatio);
    }
    renderSceneGraph(arr, bounds) {
        const ctx = this._canvasContext2d;
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
            if (instance_1.ige.config.debug._timing) {
                while (arrCount--) {
                    ctx.save();
                    ts = new Date().getTime();
                    arr[arrCount].tick(ctx);
                    td = new Date().getTime() - ts;
                    if (arr[arrCount]) {
                        if (!instance_1.ige.engine._timeSpentInTick[arr[arrCount].id()]) {
                            instance_1.ige.engine._timeSpentInTick[arr[arrCount].id()] = 0;
                        }
                        if (!instance_1.ige.engine._timeSpentLastTick[arr[arrCount].id()]) {
                            instance_1.ige.engine._timeSpentLastTick[arr[arrCount].id()] = {};
                        }
                        instance_1.ige.engine._timeSpentInTick[arr[arrCount].id()] += td;
                        instance_1.ige.engine._timeSpentLastTick[arr[arrCount].id()].ms = td;
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
}
exports.IgeRenderer2d = IgeRenderer2d;
