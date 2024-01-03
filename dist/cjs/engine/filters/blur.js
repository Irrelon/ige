"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blur = void 0;
const exports_1 = require("../../export/exports.js");
const blur = function (canvas, ctx, originalImage, texture, data) {
    const oneNinth = 1 / 9;
    let strength = 1, loop, pixelData;
    pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!pixelData)
        return;
    if (data && data.value) {
        strength = data.value;
    }
    for (loop = 0; loop < strength; loop++) {
        pixelData = exports_1.igeFilters.helper._convolute(pixelData, [
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth
        ]);
    }
    // Put the new pixel data
    ctx.putImageData(pixelData, 0, 0);
};
exports.blur = blur;
exports_1.igeFilters.registerFilter("blur", exports.blur);
