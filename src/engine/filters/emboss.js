import { convoluteHelper } from "./convolute";
import { igeFilters } from "../igeFilters";

export const emboss = function (canvas, ctx, originalImage, texture, data) {
	const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	if (!imgData) return;
	// Apply the filter and then put the new pixel data
	const imageData = convoluteHelper(imgData, [-2, -1, 0, -1, 1, 1, 0, 1, 2]);
	if (!imageData) return;
	ctx.putImageData(imageData, 0, 0);
};
igeFilters.registerFilter("emboss", emboss);
