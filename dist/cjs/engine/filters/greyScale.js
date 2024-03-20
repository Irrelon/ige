"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.greyScale = exports.greyScaleHelper = void 0;
const igeFilters_1 = require("../utils/igeFilters.js");
const greyScaleHelper = function (imageData) {
    const data = imageData.data;
    const dataLength = data.length;
    for (let i = 0; i < dataLength; i += 4) {
        // Extract pixel colour values
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];
        // CIE luminance for the RGB, de-emphasizing red and blue as human eye is bad at seeing them.
        const grayscaleValue = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        // Set each color channel to the grayscale value
        data[i] = data[i + 1] = data[i + 2] = grayscaleValue;
    }
    return imageData;
};
exports.greyScaleHelper = greyScaleHelper;
const greyScale = function (canvas, ctx, originalImage, texture, data) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imgData)
        return;
    // Apply the filter and then put the new pixel data
    const imageData = (0, exports.greyScaleHelper)(imgData);
    if (!imageData)
        return;
    ctx.putImageData(imageData, 0, 0);
};
exports.greyScale = greyScale;
igeFilters_1.igeFilters.registerFilter("greyScale", exports.greyScale);
