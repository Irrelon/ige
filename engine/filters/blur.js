import { igeFilters } from "../igeFilters.js";
export const blur = function (canvas, ctx, originalImage, texture, data) {
    const oneNinth = 1 / 9;
    let strength = 1, loop, pixelData;
    pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (data && data.value) {
        strength = data.value;
    }
    for (loop = 0; loop < strength; loop++) {
        pixelData = igeFilters.helper._convolute(pixelData, [
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth,
            oneNinth
        ]);
    }
    // Put the new pixel data
    ctx.putImageData(pixelData, 0, 0);
};
igeFilters.registerFilter("blur", blur);
