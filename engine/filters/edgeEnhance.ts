import { IgeSmartFilter } from "../../types/IgeSmartFilter";
import { convoluteHelper } from "./convolute";
import igeFilters from "../services/igeFilters";

export const edgeEnhance: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
    if (!texture._filterImageDrawn || !data || !data.cumulative) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0);
        texture._filterImageDrawn = true;
    }

    // Apply the filter and then put the new pixel data
    const imageData = convoluteHelper(ctx.getImageData(0, 0, canvas.width, canvas.height), [0, 0, 0, -1, 1, 0, 0, 0, 0], true);

    if (!imageData) return;
    ctx.putImageData(imageData, 0, 0);
};

igeFilters.registerFilter("edgeEnhance", edgeEnhance);
