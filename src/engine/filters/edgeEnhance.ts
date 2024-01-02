import { convoluteHelper } from "./convolute";
import { igeFilters } from "../igeFilters";
import type { IgeSmartFilter } from "@/types/IgeSmartFilter";

export const edgeEnhance: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
	if (!texture._filterImageDrawn || !data || !data.cumulative) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(originalImage, 0, 0);
		texture._filterImageDrawn = true;
	}

	const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	if (!imgData) return;

	// Apply the filter and then put the new pixel data
	const imageData = convoluteHelper(imgData, [0, 0, 0, -1, 1, 0, 0, 0, 0], true);

	if (!imageData) return;
	ctx.putImageData(imageData, 0, 0);
};

igeFilters.registerFilter("edgeEnhance", edgeEnhance);
