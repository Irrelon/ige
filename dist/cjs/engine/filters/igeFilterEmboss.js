"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.igeFilterEmboss = void 0;
const igeFilterConvolute_1 = require("./igeFilterConvolute.js");
const igeFilters_1 = require("../utils/igeFilters.js");
const igeFilterEmboss = function (canvas, ctx, originalImage, texture, data) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imgData)
        return;
    // Apply the filter and then put the new pixel data
    const imageData = (0, igeFilterConvolute_1.convoluteHelper)(imgData, [-2, -1, 0, -1, 1, 1, 0, 1, 2]);
    if (!imageData)
        return;
    ctx.putImageData(imageData, 0, 0);
};
exports.igeFilterEmboss = igeFilterEmboss;
igeFilters_1.igeFilters.registerFilter("igeFilterEmboss", exports.igeFilterEmboss);
