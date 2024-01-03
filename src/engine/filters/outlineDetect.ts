import { convoluteHelper } from "@/export/exports";
import { igeFilters } from "@/export/exports";
import type { IgeSmartFilter } from "@/export/exports";

export const outlineDetect: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
	const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	if (!imgData) return;

	// Apply the filter and then put the new pixel data
	const imageData = convoluteHelper(imgData, [0, 1, 0, 1, -4, 1, 0, 1, 0]);

	if (!imageData) return;

	ctx.putImageData(imageData, 0, 0);
};

igeFilters.registerFilter("outlineDetect", outlineDetect);
