"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invert = void 0;
const igeFilters_1 = require("../utils/igeFilters.js");
const invert = function (canvas, ctx, originalImage, texture, data) {
    const w = canvas.width, h = canvas.height;
    const canvasData = ctx.getImageData(0, 0, w, h);
    if (!canvasData)
        return;
    for (let i = 0; i < w * h * 4; i += 4) {
        canvasData.data[i] = 255 - canvasData.data[i];
        canvasData.data[i + 1] = 255 - canvasData.data[i + 1];
        canvasData.data[i + 2] = 255 - canvasData.data[i + 2];
    }
    ctx.putImageData(canvasData, 0, 0);
};
exports.invert = invert;
igeFilters_1.igeFilters.registerFilter("invert", exports.invert);
