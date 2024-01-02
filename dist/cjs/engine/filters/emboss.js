"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emboss = void 0;
const convolute_1 = require("./convolute");
const igeFilters_1 = require("../igeFilters");
const emboss = function (canvas, ctx, originalImage, texture, data) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imgData)
        return;
    // Apply the filter and then put the new pixel data
    const imageData = (0, convolute_1.convoluteHelper)(imgData, [-2, -1, 0, -1, 1, 1, 0, 1, 2]);
    if (!imageData)
        return;
    ctx.putImageData(imageData, 0, 0);
};
exports.emboss = emboss;
igeFilters_1.igeFilters.registerFilter("emboss", exports.emboss);
