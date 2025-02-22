"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorReplace = void 0;
const igeFilters_1 = require("../utils/igeFilters.js");
const colorReplace = function (canvas, ctx, originalImage, texture, data) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imgData)
        return;
    const imgDataArr = imgData.data;
    // Iterate through each pixel
    for (let i = 0; i < imgDataArr.length; i += 4) {
        const [r, g, b, a] = [imgDataArr[i], imgDataArr[i + 1], imgDataArr[i + 2], imgDataArr[i + 3]];
        // Check if pixel matches the target color
        if (r === data.sourceColor[0] &&
            g === data.sourceColor[1] &&
            b === data.sourceColor[2] &&
            a === data.sourceColor[3]) {
            // Replace with new color
            imgDataArr[i] = data.targetColor[0];
            imgDataArr[i + 1] = data.targetColor[1];
            imgDataArr[i + 2] = data.targetColor[2];
            imgDataArr[i + 3] = data.targetColor[3];
        }
    }
    // Put modified data back on canvas
    ctx.putImageData(imgData, 0, 0);
};
exports.colorReplace = colorReplace;
igeFilters_1.igeFilters.registerFilter("colorReplace", exports.colorReplace);
