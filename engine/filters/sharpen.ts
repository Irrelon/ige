import { convoluteHelper } from "./convolute";
import { IgeSmartFilter } from "../../types/IgeSmartFilter";
import igeFilters from "../services/igeFilters";

export const sharpen: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
    let strength = 1,
        loop;

    if (data && data.value) {
        strength = data.value;
    }

    for (loop = 0; loop < strength; loop++) {
        const imageData = convoluteHelper(ctx.getImageData(0, 0, canvas.width, canvas.height), [0, -1, 0, -1, 5, -1, 0, -1, 0]);

        if (!imageData) return;

        // Apply the filter and then put the new pixel data
        ctx.putImageData(imageData, 0, 0);
    }
};

igeFilters.registerFilter("sharpen", sharpen);
