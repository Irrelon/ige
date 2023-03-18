import { IgeSmartFilter } from "../../types/IgeSmartFilter";
import { convoluteHelper } from "./convolute";
import { igeFilters } from "../services/igeFilters";

export const outlineDetect: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
	// Apply the filter and then put the new pixel data
	const imageData = convoluteHelper(ctx.getImageData(0, 0, canvas.width, canvas.height), [0, 1, 0, 1, -4, 1, 0, 1, 0]);

	if (!imageData) return;

	ctx.putImageData(imageData, 0, 0);
};

igeFilters.registerFilter("outlineDetect", outlineDetect);
