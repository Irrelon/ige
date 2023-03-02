import { IgeSmartFilter } from "../../types/IgeSmartFilter";
import { convoluteHelper } from "./convolute";
import igeFilters from "../../services/igeFilters";

export const sobel: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
    let strength = 1,
        loop;

    if (data && data.value) {
        strength = data.value;
    }

    for (loop = 0; loop < strength; loop++) {
        // Apply the filter and then put the new pixel data
        const imageData = convoluteHelper(ctx.getImageData(0, 0, canvas.width, canvas.height), [-1, -1, 1, -2, 0, 2, -1, 1, 1], true);

        if (!imageData) return;

        ctx.putImageData(imageData, 0, 0);
    }
};

igeFilters.registerFilter("sobel", sobel);
