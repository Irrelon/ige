"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharpen = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const sharpen = function (canvas, ctx, originalImage, texture, data) {
    let strength = 1, loop;
    if (data && data.value) {
        strength = data.value;
    }
    for (loop = 0; loop < strength; loop++) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!imgData)
            return;
        const imageData = (0, exports_1.convoluteHelper)(imgData, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
        if (!imageData)
            return;
        // Apply the filter and then put the new pixel data
        ctx.putImageData(imageData, 0, 0);
    }
};
exports.sharpen = sharpen;
exports_2.igeFilters.registerFilter("sharpen", exports.sharpen);
