"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.igeFilterEdgeEnhance = void 0;
const igeFilterConvolute_1 = require("./igeFilterConvolute.js");
const igeFilters_1 = require("../utils/igeFilters.js");
const igeFilterEdgeEnhance = function (canvas, ctx, originalImage, texture, data) {
    if (!texture._filterImageDrawn || !data || !data.cumulative) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0);
        texture._filterImageDrawn = true;
    }
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imgData)
        return;
    // Apply the filter and then put the new pixel data
    const imageData = (0, igeFilterConvolute_1.convoluteHelper)(imgData, [0, 0, 0, -1, 1, 0, 0, 0, 0], true);
    if (!imageData)
        return;
    ctx.putImageData(imageData, 0, 0);
};
exports.igeFilterEdgeEnhance = igeFilterEdgeEnhance;
igeFilters_1.igeFilters.registerFilter("igeFilterEdgeEnhance", exports.igeFilterEdgeEnhance);
