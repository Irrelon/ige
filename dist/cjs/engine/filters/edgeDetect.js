"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edgeDetect = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const edgeDetect = function (canvas, ctx, originalImage, texture, data) {
    if (!texture._filterImageDrawn || !data || !data.cumulative) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0);
        texture._filterImageDrawn = true;
    }
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imgData)
        return;
    const newData = (0, exports_1.convoluteHelper)(imgData, [-1, -1, -1, -1, -1, -1, 2, 2, 2, -1, -1, 2, 0, 2, -1, -1, 2, 2, 2, -1, -1, -1, -1, -1, -1], true);
    if (!newData)
        return;
    const arr = newData.data;
    const arrCount = arr.length;
    let i, r, g, b, v;
    for (i = 0; i < arrCount; i += 4) {
        r = arr[i];
        g = arr[i + 1];
        b = arr[i + 2];
        v = (r + g + b) / 3;
        v *= 1.1;
        v = v >= data.value ? 255 : 0;
        arr[i] = arr[i + 1] = arr[i + 2] = v;
    }
    // Apply the filter and then put the new pixel data
    ctx.putImageData(newData, 0, 0);
};
exports.edgeDetect = edgeDetect;
exports_2.igeFilters.registerFilter("edgeDetect", exports.edgeDetect);
