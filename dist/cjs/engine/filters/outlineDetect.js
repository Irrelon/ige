"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outlineDetect = void 0;
const convolute_1 = require("./convolute.js");
const igeFilters_1 = require("../utils/igeFilters.js");
const outlineDetect = function (canvas, ctx, originalImage, texture, data) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imgData)
        return;
    // Apply the filter and then put the new pixel data
    const imageData = (0, convolute_1.convoluteHelper)(imgData, [0, 1, 0, 1, -4, 1, 0, 1, 0]);
    if (!imageData)
        return;
    ctx.putImageData(imageData, 0, 0);
};
exports.outlineDetect = outlineDetect;
igeFilters_1.igeFilters.registerFilter("outlineDetect", exports.outlineDetect);
