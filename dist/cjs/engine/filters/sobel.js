"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sobel = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const sobel = function (canvas, ctx, originalImage, texture, data) {
    let strength = 1, loop;
    if (data && data.value) {
        strength = data.value;
    }
    for (loop = 0; loop < strength; loop++) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!imgData)
            return;
        // Apply the filter and then put the new pixel data
        const imageData = (0, exports_1.convoluteHelper)(imgData, [-1, -1, 1, -2, 0, 2, -1, 1, 1], true);
        if (!imageData)
            return;
        ctx.putImageData(imageData, 0, 0);
    }
};
exports.sobel = sobel;
exports_2.igeFilters.registerFilter("sobel", exports.sobel);
