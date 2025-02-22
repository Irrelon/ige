"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.igeFilterSobel = void 0;
const igeFilterConvolute_1 = require("./igeFilterConvolute.js");
const igeFilters_1 = require("../utils/igeFilters.js");
const igeFilterSobel = function (canvas, ctx, originalImage, texture, data) {
    let strength = 1, loop;
    if (data && data.value) {
        strength = data.value;
    }
    for (loop = 0; loop < strength; loop++) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!imgData)
            return;
        // Apply the filter and then put the new pixel data
        const imageData = (0, igeFilterConvolute_1.convoluteHelper)(imgData, [-1, -1, 1, -2, 0, 2, -1, 1, 1], true);
        if (!imageData)
            return;
        ctx.putImageData(imageData, 0, 0);
    }
};
exports.igeFilterSobel = igeFilterSobel;
igeFilters_1.igeFilters.registerFilter("igeFilterSobel", exports.igeFilterSobel);
