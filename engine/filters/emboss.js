import { convoluteHelper } from "./convolute.js";
import igeFilters from "../services/igeFilters.js";
export const emboss = function (canvas, ctx, originalImage, texture, data) {
    // Apply the filter and then put the new pixel data
    const imageData = convoluteHelper(ctx.getImageData(0, 0, canvas.width, canvas.height), [-2, -1, 0, -1, 1, 1, 0, 1, 2]);
    if (!imageData)
        return;
    ctx.putImageData(imageData, 0, 0);
};
igeFilters.registerFilter("emboss", emboss);
