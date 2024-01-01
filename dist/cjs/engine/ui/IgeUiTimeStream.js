"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiTimeStream = void 0;
const IgeUiElement_1 = require("../core/IgeUiElement.js");
const igeClassStore_1 = require("../igeClassStore.js");
const instance_1 = require("../instance.js");
class IgeUiTimeStream extends IgeUiElement_1.IgeUiElement {
    constructor() {
        super(...arguments);
        this.classId = "IgeUiTimeStream";
    }
    monitor(entity) {
        this._entity = entity;
    }
    tick(ctx) {
        // Draw timeline
        const renderTime = instance_1.ige.engine._tickStart - instance_1.ige.network._renderLatency;
        let i, text, xAdjust, arr, arrCount, arrItem, deltaTime;
        super.tick(ctx);
        ctx.strokeStyle = "#fffc00";
        ctx.beginPath();
        ctx.moveTo(-200, -25.5);
        ctx.lineTo(200, -25.5);
        ctx.stroke();
        ctx.font = "normal 10px Verdana";
        for (i = 0; i < 9; i++) {
            ctx.beginPath();
            if (((i - 2) * 10) === 0) {
                // This is the render point, change colour for this one
                ctx.strokeStyle = "#ff6600";
            }
            else {
                ctx.strokeStyle = "#ffffff";
            }
            ctx.moveTo(-200.5 + (i * 50), -30);
            ctx.lineTo(-200.5 + (i * 50), 30);
            ctx.stroke();
            text = -instance_1.ige.network.stream._renderLatency + ((i - 2) * 10) + "ms";
            xAdjust = ctx.measureText(text);
            ctx.strokeText(text, -200 + (i * 50) - (xAdjust.width / 2), -38);
            if (((i - 2) * 10) === 0) {
                text = "Render Point";
                xAdjust = ctx.measureText(text);
                ctx.strokeText(text, -200 + (i * 50) - (xAdjust.width / 2), -52);
            }
        }
        if (this._entity) {
            arr = this._entity._timeStream;
            // Check if we have a time stream and data
            if (arr && arr.length) {
                arrCount = arr.length;
                for (i = 0; i < arrCount; i++) {
                    arrItem = arr[i];
                    deltaTime = arrItem[0] - renderTime;
                    ctx.strokeRect(-105 + ((deltaTime / 10) * 50), -5, 10, 10);
                }
            }
            instance_1.ige.client.custom2.value = this._entity._timeStreamDataDelta;
            instance_1.ige.client.custom3.value = this._entity._timeStreamOffsetDelta;
            instance_1.ige.client.custom4.value = this._entity._timeStreamCurrentInterpolateTime;
        }
    }
}
exports.IgeUiTimeStream = IgeUiTimeStream;
(0, igeClassStore_1.registerClass)(IgeUiTimeStream);
