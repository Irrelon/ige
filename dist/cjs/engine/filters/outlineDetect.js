"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outlineDetect = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const outlineDetect = function (canvas, ctx, originalImage, texture, data) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imgData)
        return;
    // Apply the filter and then put the new pixel data
    const imageData = (0, exports_1.convoluteHelper)(imgData, [0, 1, 0, 1, -4, 1, 0, 1, 0]);
    if (!imageData)
        return;
    ctx.putImageData(imageData, 0, 0);
};
exports.outlineDetect = outlineDetect;
exports_2.igeFilters.registerFilter("outlineDetect", exports.outlineDetect);
