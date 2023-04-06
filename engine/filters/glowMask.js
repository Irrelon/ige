import { igeFilters } from "../igeFilters.js";
import { convoluteHelper } from "./convolute.js";
export const glowMask = function (canvas, ctx, originalImage, texture, data) {
    const oneNinth = 1 / 9;
    let pixelData, tempCanvas, tempCtx, i;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (data.blurPasses) {
        ctx.drawImage(data.glowMask.image, 0, 0);
        pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (i = 0; i < data.blurPasses; i++) {
            if (!pixelData)
                return;
            pixelData = convoluteHelper(pixelData, [oneNinth, oneNinth, oneNinth, oneNinth, oneNinth, oneNinth, oneNinth, oneNinth, oneNinth], false);
        }
        if (!pixelData)
            return;
        tempCanvas = new OffscreenCanvas(2, 2);
        tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx === null || tempCtx === void 0 ? void 0 : tempCtx.putImageData(pixelData, 0, 0);
    }
    else {
        tempCanvas = data.glowMask.image;
    }
    ctx.drawImage(originalImage, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < data.glowPasses; i++) {
        // Apply the filter and then put the new pixel data
        ctx.drawImage(tempCanvas, 0, 0);
    }
};
igeFilters.registerFilter("glowMask", glowMask);
