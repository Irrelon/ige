import { igeFilters } from "../utils/igeFilters.js"
export const thresholdHelper = function (imageData, texture, data) {
    let i, r, g, b, v;
    const thresholdVal = texture.data("IgeFilters.threshold.value") || data.value;
    const arr = imageData.data;
    const arrCount = arr.length;
    for (i = 0; i < arrCount; i += 4) {
        r = arr[i];
        g = arr[i + 1];
        b = arr[i + 2];
        v = 0.2126 * r + 0.7152 * g + 0.0722 * b >= thresholdVal ? 255 : 0;
        arr[i] = arr[i + 1] = arr[i + 2] = v;
    }
    return imageData;
};
export const threshold = function (canvas, ctx, originalImage, texture, data) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imgData)
        return;
    // Apply the filter and then put the new pixel data
    ctx.putImageData(thresholdHelper(imgData, texture, data), 0, 0);
};
igeFilters.registerFilter("threshold", threshold);
