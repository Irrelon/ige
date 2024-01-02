import { convoluteHelper } from "./convolute";
import { igeFilters } from "../igeFilters";
import type { IgeSmartFilter } from "@/types/IgeSmartFilter";

export const sobel: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
	let strength = 1,
		loop;

	if (data && data.value) {
		strength = data.value;
	}

	for (loop = 0; loop < strength; loop++) {
		const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		if (!imgData) return;

		// Apply the filter and then put the new pixel data
		const imageData = convoluteHelper(imgData, [-1, -1, 1, -2, 0, 2, -1, 1, 1], true);

		if (!imageData) return;

		ctx.putImageData(imageData, 0, 0);
	}
};

igeFilters.registerFilter("sobel", sobel);
