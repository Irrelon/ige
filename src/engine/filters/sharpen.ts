import { convoluteHelper } from "@/export/exports";
import { igeFilters } from "@/export/exports";
import type { IgeSmartFilter } from "@/export/exports";

export const sharpen: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
	let strength = 1,
		loop;

	if (data && data.value) {
		strength = data.value;
	}

	for (loop = 0; loop < strength; loop++) {
		const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		if (!imgData) return;

		const imageData = convoluteHelper(imgData, [0, -1, 0, -1, 5, -1, 0, -1, 0]);

		if (!imageData) return;

		// Apply the filter and then put the new pixel data
		ctx.putImageData(imageData, 0, 0);
	}
};

igeFilters.registerFilter("sharpen", sharpen);
